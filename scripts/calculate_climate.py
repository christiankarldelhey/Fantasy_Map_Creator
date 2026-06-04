#!/usr/bin/env python3
"""
Middle-earth Climate Data Downloader
Descarga datos horarios ERA5 (1950) de Open-Meteo Archive API
para cada región del proyecto Tierra Media, de a una por vez.
"""

import requests
import csv
import time
from pathlib import Path

# ── Configuración ────────────────────────────────────────────────────────────
YEAR = 1950
START_DATE = f"{YEAR}-01-01"
END_DATE   = f"{YEAR}-12-31"
OUTPUT_DIR = Path("data/climate_data")
OUTPUT_DIR.mkdir(exist_ok=True)

HOURLY_VARS = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "snowfall",
    "cloud_cover",
    "wind_speed_10m",
    "wind_direction_10m",
    "surface_pressure",
    "soil_moisture_0_to_7cm",
    "et0_fao_evapotranspiration",
    "shortwave_radiation",
]

BASE_URL = "https://archive-api.open-meteo.com/v1/archive"

# ── Regiones (region_id, name, kingdom, lat, lon) ───────────────────────────
# Moria se saltea por ahora, como acordamos.
REGIONS = [
    (79, "Andrast", "Gondor", 42.88, -9.27),
    (13, "Anfalas", "Gondor", 43.40, 3.70),
    (46, "Angmar", "Angmar", 61.60, 9.00),
    (7,  "Anorien", "Gondor", 43.10, 12.39),
    (64, "Apariach", "Forlindon", 54.65, -8.11),
    (28, "Ardolyalinya", "Harlindon", 51.97, -9.52),
    (33, "Ardquetto", "Harlindon", 51.67, -9.46),
    (49, "Ascahiriand", "Forlindon", 54.65, -8.11),
    (86, "Bree", "Arthedain", 51.83, -1.82),
    (52, "Celanoriand", "Forlindon", 60.39, 5.32),
    (35, "Central Anduin", "Anduin Vales", 48.37, 15.43),
    (39, "Central Misty Mountains", "Misty Mountains", 46.55, 8.57),
    (45, "Coldfells", "Rhudaur", 54.22, -2.15),
    (8,  "Dagorlad", "Dagorlad", 38.65, 34.83),
    (25, "Dale", "Dale", 49.48, 20.03),
    (83, "Dor Guldur", "Dor Guldur", 52.10, 27.50),
    (6,  "Dor Rhunen", "Gondor", 39.47, -6.37),
    (20, "Dor-en-Emyl", "Gondor", 38.57, -7.90),
    (87, "Dorwinion", "Dorwinion", 46.85, 38.00),
    (9,  "Druadan Forest", "Druadan Forest", 42.75, 11.10),
    (77, "Druwaith Laur", "Gondor", 51.68, -4.91),
    (72, "Dunland", "Dunland", 52.33, -3.52),
    (42, "En Egladil", "Lorien", 52.70, 23.86),
    (50, "En Udanoriath", "Arthedain", 55.25, -2.10),
    (21, "Enedhwaith", "Enedhwaith", 52.22, -3.94),
    (1,  "Eothraim", "Eothraim", 49.60, 34.55),
    (47, "Ered Luin", "Forlindon", 60.15, 7.30),
    (27, "Ered Luin", "Harlindon", 60.63, 6.42),
    (34, "Ered Luin Vales", "Harlindon", 53.47, -9.95),
    (70, "Eregion", "Cardolan", 50.37, 6.65),
    (10, "Esgaroth", "Esgaroth", 46.92, 17.90),
    (44, "Ettenmoors", "Rhudaur", 54.80, -2.30),
    (56, "Evendim Hills", "Arthedain", 56.10, -4.60),
    (82, "Fangorn", "Fangorn", 49.05, 13.35),
    (75, "Forithilien", "Gondor", 43.05, 11.60),
    (57, "Fornost", "Arthedain", 55.50, -2.00),
    (73, "Forochel", "Forochel", 70.66, 25.10),
    (66, "Forovirian", "Forovirian", 67.13, 20.66),
    (2,  "Gramuz", "Gramuz", 49.00, 21.24),
    (78, "Hairavercien", "Gondor", 42.35, 13.50),
    (18, "Harithilien", "Gondor", 43.95, 4.40),
    (12, "Harondor", "Gondor", 36.77, -2.19),
    (24, "Iron Hills", "Iron Hills", 54.70, 61.40),
    (30, "Lairiardhon", "Harlindon", 52.85, -9.00),
    (19, "Lamedon", "Gondor", 40.22, 15.30),
    (11, "Lebennin", "Gondor", 44.35, 12.35),
    (31, "Lildardhon", "Harlindon", 53.27, -9.05),
    (81, "Lone-lands", "Rhudaur", 54.36, -0.80),
    (84, "Lorien", "Lorien", 52.70, 23.86),
    (51, "Mänoriand", "Forlindon", 54.65, -8.11),
    (16, "Minhiriath", "Cardolan", 47.65, -2.76),
    (60, "Mintyrnath", "Cardolan", 46.58, -0.34),
    (3,  "Mirkwood Wilds", "Mirkwood Wilds", 49.20, 22.50),
    (74, "Mordor", "Mordor", 39.55, 44.08),
    (38, "Nan Anduin", "Anduin Vales", 49.20, 17.00),
    (68, "North Misty Mountains", "Misty Mountains", 61.60, 8.30),
    (48, "Numeriador", "Forlindon", 54.95, -7.74),
    (76, "Nurn", "Nurn", 37.50, 45.50),
    (58, "Old Forest", "Old Forest", 50.87, -1.60),
    (5,  "Parth Celebrant", "Wilderness of Arnor", 49.22, 17.67),
    (55, "Rammas Formen", "Arthedain", 54.90, -4.00),
    (17, "Rast Vorn", "Rast Vorn", 42.88, -9.27),
    (80, "Rivendell", "Rivendell", 46.50, 9.83),
    (62, "Rohan", "Rohan", 47.60, 21.00),
    (26, "Ronalindon", "Harlindon", 53.54, -9.80),
    (36, "Ronen-in-Anduin", "Anduin Vales", 49.22, 17.67),
    (53, "Sandariand", "Forlindon", 54.13, -9.90),
    (15, "South Arthedain", "Arthedain", 51.83, -1.82),
    (59, "South Downs", "Cardolan", 51.00, -1.00),
    (32, "South Harlindon", "Harlindon", 50.12, -5.54),
    (54, "Talath Muil", "Arthedain", 57.16, -3.83),
    (67, "Talath Uichel", "Talath Uichel", 68.90, 27.01),
    (85, "The Shire", "Arthedain", 51.83, -1.82),
    (22, "Tol Fuin", "Forlindon", 60.15, -1.15),
    (23, "Tolfalas", "Gondor", 41.85, 16.00),
    (40, "Tower Hills", "Harlindon", 53.12, -9.06),
    (43, "Trollshaws", "Rhudaur", 50.77, 15.05),
    (65, "Vinyalas", "Forlindon", 55.24, -7.10),
    (61, "Weather Hills", "Arthedain", 53.37, -1.80),
    (41, "West Rhudaur", "Rhudaur", 50.77, 15.05),
    (14, "Westmarch", "Gondor", 41.98, 3.21),
    (69, "Wilderness of Arnor", "Wilderness of Arnor", 55.55, -2.80),
    (63, "Wold", "Rohan", 44.20, 28.60),
    (4,  "Woodland Realm", "Woodland Realm", 49.20, 22.50),
    (37, "Woodmen", "Woodmen", 49.55, 18.20),
]


def safe_filename(name: str) -> str:
    return (
        name.replace(" ", "_")
            .replace("/", "-")
            .replace(",", "")
            .replace("ä", "a")
            .replace("ë", "e")
            .replace("ï", "i")
            .replace("ö", "o")
            .replace("ü", "u")
    )


def output_file(region_id: int, name: str) -> Path:
    return OUTPUT_DIR / f"{region_id}_{safe_filename(name)}.csv"


def already_downloaded(region_id: int, name: str) -> bool:
    return output_file(region_id, name).exists()


def download_region(region_id: int, name: str, kingdom: str, lat: float, lon: float) -> bool:
    fname = output_file(region_id, name)

    if fname.exists():
        print(f"  [SKIP] {name} (ya existe)")
        return True

    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": START_DATE,
        "end_date": END_DATE,
        "hourly": ",".join(HOURLY_VARS),
        "timezone": "UTC",
    }

    try:
        resp = requests.get(BASE_URL, params=params, timeout=90)
        resp.raise_for_status()
        data = resp.json()

        hourly = data.get("hourly", {})
        if not hourly or "time" not in hourly:
            print(f"  [ERROR] {name}: respuesta vacía o sin hourly.time")
            return False

        # Convertir a CSV usando librería estándar
        time_data = hourly.get("time", [])
        num_rows = len(time_data)

        with open(fname, 'w', newline='') as f:
            writer = csv.writer(f)

            # Header
            header = ["region_id", "region_name", "kingdom", "lat", "lon"] + list(hourly.keys())
            writer.writerow(header)

            # Data rows
            for i in range(num_rows):
                row = [region_id, name, kingdom, lat, lon]
                for key in hourly.keys():
                    row.append(hourly[key][i] if i < len(hourly[key]) else "")
                writer.writerow(row)

        print(f"  [OK] {name} ({kingdom}) → {num_rows} filas → {fname.name}")
        return True

    except requests.exceptions.HTTPError as e:
        print(f"  [HTTP ERROR] {name}: {e}")
        try:
            print(resp.text[:500])
        except Exception:
            pass
        return False
    except requests.exceptions.Timeout:
        print(f"  [TIMEOUT] {name}")
        return False
    except Exception as e:
        print(f"  [ERROR] {name}: {e}")
        return False


def main():
    print("=== Middle-earth Climate Downloader ===")
    print(f"Año: {YEAR}")
    print(f"Variables horarias: {len(HOURLY_VARS)}")
    print(f"Regiones: {len(REGIONS)}")
    print(f"Salida: {OUTPUT_DIR.resolve()}\n")

    ok = 0
    skipped = 0
    failed = 0
    failed_list = []

    for i, (region_id, name, kingdom, lat, lon) in enumerate(REGIONS, 1):
        print(f"[{i:02d}/{len(REGIONS)}] {name} ({kingdom}) lat={lat} lon={lon}")

        if already_downloaded(region_id, name):
            skipped += 1
            print(f"  [SKIP] {name} (ya existe)")
            continue

        success = download_region(region_id, name, kingdom, lat, lon)

        if success:
            ok += 1
        else:
            failed += 1
            failed_list.append(name)

        time.sleep(1.5)

    print("\n=== Resultado ===")
    print(f"OK: {ok}")
    print(f"Salteadas: {skipped}")
    print(f"Fallidas: {failed}")

    if failed_list:
        print("Regiones fallidas:")
        for name in failed_list:
            print(f" - {name}")

    print(f"\nArchivos guardados en: {OUTPUT_DIR.resolve()}")


if __name__ == "__main__":
    main()