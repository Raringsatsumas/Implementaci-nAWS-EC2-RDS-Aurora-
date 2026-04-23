import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsgluedq.transforms import EvaluateDataQuality
from awsglue import DynamicFrame

def sparkSqlQuery(glueContext, query, mapping, transformation_ctx) -> DynamicFrame:
    for alias, frame in mapping.items():
        frame.toDF().createOrReplaceTempView(alias)
    result = spark.sql(query)
    return DynamicFrame.fromDF(result, glueContext, transformation_ctx)
args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Default ruleset used by all target nodes with data quality enabled
DEFAULT_DATA_QUALITY_RULESET = """
    Rules = [
        ColumnCount > 0
    ]
"""

# Script generated for node invoice
invoice_node1776895977929 = glueContext.create_dynamic_frame.from_catalog(database="chinook2", table_name="chinook_invoice", transformation_ctx="invoice_node1776895977929")

# Script generated for node invoiceLine
invoiceLine_node1776895975643 = glueContext.create_dynamic_frame.from_catalog(database="chinook2", table_name="chinook_invoiceline", transformation_ctx="invoiceLine_node1776895975643")

# Script generated for node customer
customer_node1776895979409 = glueContext.create_dynamic_frame.from_catalog(database="chinook2", table_name="chinook_customer", transformation_ctx="customer_node1776895979409")

# Script generated for node SQL Query
SqlQuery995 = '''
SELECT
    i.customerid                                      AS CustomerKey,
    il.trackid                                        AS TrackKey,
    CAST(date_format(i.invoicedate, 'yyyyMMdd') AS INT) AS InvoiceDateKey,
    c.supportrepid                                    AS EmployeeKey,
    il.quantity                                       AS Quantity,
    il.unitprice                                      AS UnitPrice,
    (il.quantity * il.unitprice)                      AS TotalAmount,
    year(i.invoicedate)                               AS part_year,
    month(i.invoicedate)                              AS part_month,
    day(i.invoicedate)                                AS part_day
FROM il
JOIN i
  ON il.invoiceid = i.invoiceid
LEFT JOIN c
  ON i.customerid = c.customerid
'''
SQLQuery_node1776896110470 = sparkSqlQuery(glueContext, query = SqlQuery995, mapping = {"il":invoiceLine_node1776895975643, "i":invoice_node1776895977929, "c":customer_node1776895979409}, transformation_ctx = "SQLQuery_node1776896110470")

# Script generated for node Amazon S3
EvaluateDataQuality().process_rows(frame=SQLQuery_node1776896110470, ruleset=DEFAULT_DATA_QUALITY_RULESET, publishing_options={"dataQualityEvaluationContext": "EvaluateDataQuality_node1776895950863", "enableDataQualityResultsPublishing": True}, additional_options={"dataQualityResultsPublishing.strategy": "BEST_EFFORT", "observations.scope": "ALL"})
AmazonS3_node1776896209974 = glueContext.getSink(path="s3://chinook-analytics-curated/fact_sales/", connection_type="s3", updateBehavior="UPDATE_IN_DATABASE", partitionKeys=[], enableUpdateCatalog=True, transformation_ctx="AmazonS3_node1776896209974")
AmazonS3_node1776896209974.setCatalogInfo(catalogDatabase="chinook2",catalogTableName="fact_sales")
AmazonS3_node1776896209974.setFormat("glueparquet", compression="snappy")
AmazonS3_node1776896209974.writeFrame(SQLQuery_node1776896110470)
job.commit()
