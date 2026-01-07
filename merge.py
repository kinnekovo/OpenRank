import pandas as pd
import os

def merge_csv_to_excel_with_sheets(csv_folder_path, output_excel_path):
    """
    将指定文件夹下的所有CSV文件，合并为一个Excel文件的多个Sheet
    :param csv_folder_path: 存放所有CSV文件的文件夹路径
    :param output_excel_path: 输出的Excel文件路径（如：merged_data.xlsx）
    """
    # 创建Excel写入器
    with pd.ExcelWriter(output_excel_path, engine='openpyxl') as writer:
        # 遍历文件夹下所有CSV文件
        for file_name in os.listdir(csv_folder_path):
            if file_name.endswith('.csv'):
                # 拼接完整文件路径
                csv_file_path = os.path.join(csv_folder_path, file_name)
                # 提取Sheet名（去掉.csv后缀）
                sheet_name = os.path.splitext(file_name)[0]
                
                try:
                    # 读取CSV文件
                    df = pd.read_csv(csv_file_path, encoding='utf-8')
                    # 将数据写入对应Sheet
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                    print(f"✅ 成功导入：{file_name} → Sheet名：{sheet_name}")
                except Exception as e:
                    print(f"❌ 处理失败：{file_name}，错误：{str(e)}")
    
    print(f"\n🎉 所有CSV已合并完成！输出文件：{output_excel_path}")

# ====================== 配置参数（修改这部分！）======================
# 1. 存放所有CSV文件的文件夹路径（绝对路径/相对路径都可以）
CSV_FOLDER = "./data"  # 示例：你的CSV都放在这个文件夹里
# 2. 输出的Excel文件路径
OUTPUT_EXCEL = "merged_data.xlsx"

# 执行合并
merge_csv_to_excel_with_sheets(CSV_FOLDER, OUTPUT_EXCEL)