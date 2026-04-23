from pathlib import Path

def test_dim_date_script_exists():
    assert Path("glue/dim_date.py").exists()

def test_dim_date_contains_required_logic():
    content = Path("glue/dim_date.py").read_text(encoding="utf-8")

    assert "holidays" in content
    assert "DateKey" in content
    assert "FullDate" in content
    assert "Year" in content
    assert "Quarter" in content
    assert "Month" in content
    assert "Day" in content
    assert "DayOfWeek" in content
    assert "IsHoliday" in content
    assert "s3://chinook-analytics-curated/dim_date/" in contentif min_date is None or max_date is None:
    raise ValueError("No se encontraron fechas en la tabla invoice")

# -------- 3. Generar calendario --------
date_index = pd.date_range(start=min_date.date(), end=max_date.date(), freq="D")

# Colombia holidays
co_holidays = holidays.country_holidays("CO", years=list(set(date_index.year)))

rows = []
for d in date_index:
    rows.append({
        "DateKey": int(d.strftime("%Y%m%d")),
        "FullDate": d.strftime("%Y-%m-%d"),
        "Year": int(d.year),
        "Quarter": int(((d.month - 1) // 3) + 1),
        "Month": int(d.month),
        "Day": int(d.day),
        "DayOfWeek": d.day_name(),
        "IsHoliday": bool(d.date() in co_holidays)
    })

pdf = pd.DataFrame(rows)

schema = T.StructType([
    T.StructField("DateKey", T.IntegerType(), False),
    T.StructField("FullDate", T.StringType(), False),
    T.StructField("Year", T.IntegerType(), False),
    T.StructField("Quarter", T.IntegerType(), False),
    T.StructField("Month", T.IntegerType(), False),
    T.StructField("Day", T.IntegerType(), False),
    T.StructField("DayOfWeek", T.StringType(), False),
    T.StructField("IsHoliday", T.BooleanType(), False),
])

dim_date_df = spark.createDataFrame(pdf, schema=schema)

# -------- 4. Escribir a S3 --------
dim_date_df.write.mode("overwrite").parquet(
    "s3://chinook-analytics-curated/dim_date/"
)

import time
import boto3
from botocore.exceptions import ClientError

# ---------- 5. Crear / actualizar / lanzar crawler ----------
glue = boto3.client("glue", region_name="us-east-1")

crawler_name = "crawler_dim_date"
catalog_database = "chinook2"   # aquí quieres que Athena vea la tabla
crawler_role = "LabRole"        # o el rol real que te deje usar el lab
s3_target_path = "s3://chinook-analytics-curated/dim_date/"

crawler_kwargs = {
    "Name": crawler_name,
    "Role": crawler_role,
    "DatabaseName": catalog_database,
    "Targets": {
        "S3Targets": [
            {"Path": s3_target_path}
        ]
    },
    "TablePrefix": "",   # puedes dejar "" o usar "analytics_"
    "SchemaChangePolicy": {
        "UpdateBehavior": "UPDATE_IN_DATABASE",
        "DeleteBehavior": "DEPRECATE_IN_DATABASE"
    }
}

try:
    glue.create_crawler(**crawler_kwargs)
    print(f"Crawler {crawler_name} creado.")
except glue.exceptions.AlreadyExistsException:
    glue.update_crawler(**crawler_kwargs)
    print(f"Crawler {crawler_name} ya existía; actualizado.")

# lo lanza
try:
    glue.start_crawler(Name=crawler_name)
    print(f"Crawler {crawler_name} iniciado.")
except glue.exceptions.CrawlerRunningException:
    print(f"Crawler {crawler_name} ya estaba corriendo.")

# esperar a que termine
while True:
    crawler = glue.get_crawler(Name=crawler_name)["Crawler"]
    state = crawler["State"]          # RUNNING / READY
    last_status = crawler.get("LastCrawl", {}).get("Status")
    print(f"State={state}, LastStatus={last_status}")

    if state == "READY":
        break

    time.sleep(15)

print("Crawler terminado.")

job.commit()
