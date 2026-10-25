"""医药生物子行业分类（申万二级口径简化版）。

未收录的代码归为「其他」。后续可以改为从导入文件或设置中读取。
"""

SUB_INDUSTRY_LABELS: dict[str, str] = {
    "chemical_pharma": "化学制药",
    "biologics": "生物制品",
    "medical_devices": "医疗器械",
    "tcm": "中药",
    "medical_services": "医疗服务 / CXO",
    "pharma_commerce": "医药商业",
    "other": "其他",
}

SUB_INDUSTRY_ORDER = list(SUB_INDUSTRY_LABELS)

_CLASSIFICATION: dict[str, str] = {
    # 化学制药
    "600276.SH": "chemical_pharma", "600196.SH": "chemical_pharma", "000963.SZ": "chemical_pharma",
    "002422.SZ": "chemical_pharma", "600521.SH": "chemical_pharma", "002001.SZ": "chemical_pharma",
    "300558.SZ": "chemical_pharma", "688180.SH": "chemical_pharma", "600079.SH": "chemical_pharma",
    "002294.SZ": "chemical_pharma", "600867.SH": "chemical_pharma", "000513.SZ": "chemical_pharma",
    # 生物制品
    "000661.SZ": "biologics", "300122.SZ": "biologics", "300142.SZ": "biologics", "300601.SZ": "biologics",
    "688276.SH": "biologics", "600161.SH": "biologics", "002007.SZ": "biologics", "300357.SZ": "biologics",
    "688235.SH": "biologics",
    # 医疗器械
    "300760.SZ": "medical_devices", "300003.SZ": "medical_devices", "688271.SH": "medical_devices",
    "300529.SZ": "medical_devices", "300832.SZ": "medical_devices", "300595.SZ": "medical_devices",
    "688617.SH": "medical_devices", "002223.SZ": "medical_devices", "300685.SZ": "medical_devices",
    # 中药
    "600436.SH": "tcm", "000538.SZ": "tcm", "600085.SH": "tcm", "000423.SZ": "tcm", "600535.SH": "tcm",
    "002287.SZ": "tcm", "600129.SH": "tcm", "600332.SH": "tcm", "600750.SH": "tcm",
    # 医疗服务 / CXO
    "603259.SH": "medical_services", "300347.SZ": "medical_services", "300015.SZ": "medical_services",
    "300759.SZ": "medical_services", "002821.SZ": "medical_services", "603127.SH": "medical_services",
    "300244.SZ": "medical_services", "300896.SZ": "medical_services", "301267.SZ": "medical_services",
    # 医药商业
    "600998.SH": "pharma_commerce", "601607.SH": "pharma_commerce", "000028.SZ": "pharma_commerce",
    "603939.SH": "pharma_commerce", "002462.SZ": "pharma_commerce",
}


def classify(code: str) -> str:
    return _CLASSIFICATION.get(code.upper(), "other")


def label_of(key: str) -> str:
    return SUB_INDUSTRY_LABELS.get(key, SUB_INDUSTRY_LABELS["other"])
