from pathlib import Path

def test_fact_sales_script_exists():
    assert Path("glue/fact_sales.py").exists()

def test_fact_sales_contains_required_fields():
    content = Path("glue/fact_sales.py").read_text(encoding="utf-8")

    assert "CustomerKey" in content
    assert "TrackKey" in content
    assert "InvoiceDateKey" in content
    assert "EmployeeKey" in content
    assert "Quantity" in content
    assert "UnitPrice" in content
    assert "TotalAmount" in content
