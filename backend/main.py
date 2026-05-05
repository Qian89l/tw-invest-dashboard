from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
import math

import pandas as pd
import yfinance as yf
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="TW Invest Strategy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TAIPEI_TZ = ZoneInfo("Asia/Taipei")

# 先手動維護交易所休市日。
# 之後可以再升級成自動抓 TWSE holiday schedule。
TWSE_HOLIDAYS_2026 = {
    "2026-01-01",
    "2026-02-12",
    "2026-02-13",
    "2026-02-16",
    "2026-02-17",
    "2026-02-18",
    "2026-02-19",
    "2026-02-20",
    "2026-02-27",
    "2026-04-03",
    "2026-04-06",
    "2026-05-01",
    "2026-06-19",
    "2026-09-25",
    "2026-09-28",
    "2026-10-09",
    "2026-10-10",
}

UPDATE_TIMES = {
    "open_update": time(9, 5),
    "mid_update": time(10, 30),
    "close_update": time(13, 35),
    "after_market_update": time(14, 35),
}

WATCH_LIST = {
    "2330": "台積電",
    "2317": "鴻海",
    "2454": "聯發科",
    "2308": "台達電",
    "0050": "元大台灣50",
    "00878": "國泰永續高股息",
}


def now_taipei():
    return datetime.now(TAIPEI_TZ)


def is_twse_trading_day(target_date):
    date_str = target_date.strftime("%Y-%m-%d")

    if target_date.weekday() >= 5:
        return False

    if date_str in TWSE_HOLIDAYS_2026:
        return False

    return True


def next_trading_day(start_date):
    current = start_date + timedelta(days=1)

    while not is_twse_trading_day(current):
        current += timedelta(days=1)

    return current


def get_next_update_time(current_dt):
    today = current_dt.date()
    current_time = current_dt.time()

    if not is_twse_trading_day(today):
        next_day = next_trading_day(today)
        return datetime.combine(
            next_day,
            UPDATE_TIMES["open_update"],
            tzinfo=TAIPEI_TZ,
        )

    for key in ["open_update", "mid_update", "close_update", "after_market_update"]:
        update_time = UPDATE_TIMES[key]

        if current_time < update_time:
            return datetime.combine(today, update_time, tzinfo=TAIPEI_TZ)

    next_day = next_trading_day(today)
    return datetime.combine(
        next_day,
        UPDATE_TIMES["open_update"],
        tzinfo=TAIPEI_TZ,
    )


def get_market_status():
    current = now_taipei()
    today = current.date()
    current_time = current.time()

    if not is_twse_trading_day(today):
        status = "休市"
        phase = "closed"
    elif current_time < time(9, 0):
        status = "開盤前"
        phase = "pre_market"
    elif time(9, 0) <= current_time <= time(13, 30):
        status = "盤中"
        phase = "trading"
    elif time(13, 30) < current_time <= time(14, 30):
        status = "盤後交易"
        phase = "after_market"
    else:
        status = "收盤後"
        phase = "market_closed"

    next_update = get_next_update_time(current)

    return {
        "status": status,
        "phase": phase,
        "isTradingDay": is_twse_trading_day(today),
        "now": current.strftime("%Y-%m-%d %H:%M:%S"),
        "timezone": "Asia/Taipei",
        "regularTradingHours": "09:00-13:30",
        "afterMarketHours": "14:00-14:30",
        "nextUpdateTime": next_update.strftime("%Y-%m-%d %H:%M:%S"),
        "updateSchedule": {
            "09:05": "開盤後更新",
            "10:30": "盤中更新",
            "13:35": "收盤後更新",
            "14:35": "盤後定價後更新",
        },
    }


def to_tw_symbol(symbol: str) -> str:
    symbol = symbol.strip()

    if symbol.endswith(".TW") or symbol.endswith(".TWO"):
        return symbol

    if symbol.isdigit():
        return f"{symbol}.TW"

    return symbol


def safe_float(value):
    try:
        if isinstance(value, pd.Series):
            value = value.iloc[0]

        value = float(value)

        if math.isnan(value):
            return 0

        return value
    except Exception:
        return 0


def analyze_stock(symbol: str):
    try:
        yf_symbol = to_tw_symbol(symbol)

        df = yf.download(
            yf_symbol,
            period="6mo",
            interval="1d",
            progress=False,
            auto_adjust=False,
        )

        if df.empty:
            return {
                "symbol": symbol,
                "name": WATCH_LIST.get(symbol, symbol),
                "error": "查無資料",
            }

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df = df.dropna()

        df["MA5"] = df["Close"].rolling(window=5).mean()
        df["MA10"] = df["Close"].rolling(window=10).mean()
        df["MA20"] = df["Close"].rolling(window=20).mean()
        df = df.dropna()

        if len(df) < 2:
            return {
                "symbol": symbol,
                "name": WATCH_LIST.get(symbol, symbol),
                "error": "資料不足",
            }

        latest = df.iloc[-1]

        close = safe_float(latest["Close"])
        ma5 = safe_float(latest["MA5"])
        ma10 = safe_float(latest["MA10"])
        ma20 = safe_float(latest["MA20"])
        volume = safe_float(latest["Volume"])
        avg_volume_5 = safe_float(df["Volume"].tail(5).mean())

        trend_score = 50
        reasons = []

        if ma5 > ma10 > ma20:
            trend_score += 25
            reasons.append("均線呈多頭排列")

        if close > ma20:
            trend_score += 15
            reasons.append("股價站上月線")

        if close > ma5:
            trend_score += 10
            reasons.append("短線強勢")

        if volume > avg_volume_5:
            trend_score += 5
            reasons.append("成交量高於近5日平均")

        trend_score = min(trend_score, 100)

        buy_signal = ma5 > ma10 > ma20 and close > ma20
        sell_signal = close < ma20 or ma5 < ma10

        if buy_signal:
            signal = "偏多推薦"
        elif sell_signal:
            signal = "偏弱觀察"
        else:
            signal = "中性觀察"

        return {
            "symbol": symbol,
            "name": WATCH_LIST.get(symbol, symbol),
            "price": round(close, 2),
            "ma5": round(ma5, 2),
            "ma10": round(ma10, 2),
            "ma20": round(ma20, 2),
            "volume": int(volume),
            "trendScore": trend_score,
            "signal": signal,
            "buySignal": buy_signal,
            "sellSignal": sell_signal,
            "buyZone": f"{round(ma10 * 0.98, 2)} - {round(ma10 * 1.02, 2)}",
            "sellZone": f"{round(close * 1.08, 2)} - {round(close * 1.15, 2)}",
            "reason": "、".join(reasons) if reasons else "目前趨勢尚未明確",
            "source": "Yahoo Finance / Yahoo 股市",
        }

    except Exception as e:
        return {
            "symbol": symbol,
            "name": WATCH_LIST.get(symbol, symbol),
            "error": str(e),
        }


@app.get("/")
def home():
    return {"message": "TW Invest API is running"}


@app.get("/api/market/status")
def market_status():
    return get_market_status()


@app.get("/api/stock/{symbol}")
def get_stock(symbol: str):
    return analyze_stock(symbol)


@app.get("/api/recommendations")
def get_recommendations():
    market = get_market_status()

    if not market["isTradingDay"]:
        return {
            "market": market,
            "updated": False,
            "reason": "今日為台股休市日，不執行每日更新。",
            "data": [],
        }

    results = []

    for symbol in WATCH_LIST.keys():
        data = analyze_stock(symbol)

        if "error" not in data:
            results.append(data)

    results = sorted(results, key=lambda x: x["trendScore"], reverse=True)

    return {
        "market": market,
        "updated": True,
        "data": results,
    }