from flask import Flask, request, jsonify, send_file, render_template
import pandas as pd
import os
import re

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def home():
    return render_template('index.html')

@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.endswith(".csv"):
        return jsonify({"error": "Invalid file type"}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        df = pd.read_csv(file_path, dtype=str)

        if "Product Category" not in df.columns:
            return jsonify({"error": "Column 'Product Category' not found in file"}), 400

        product_categories = df["Product Category"].dropna().unique().tolist()
        product_categories = [cat.strip() for cat in product_categories if cat.strip()]

        return jsonify({"categories": product_categories})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/export", methods=["POST"])
def export_file():
    data = request.json
    selected_categories = data.get("selected_categories", [])

    if not selected_categories:
        return jsonify({"error": "No categories selected"}), 400

    # Find the cleaned CSV file that was uploaded
    uploaded_files = os.listdir(UPLOAD_FOLDER)
    cleaned_file = next((f for f in uploaded_files if f.endswith(".csv")), None)

    if not cleaned_file:
        return jsonify({"error": "No cleaned file found"}), 400

    try:
        df = pd.read_csv(os.path.join(UPLOAD_FOLDER, cleaned_file), dtype=str)
    except Exception as e:
        return jsonify({"error": f"Failed to read CSV: {str(e)}"}), 500

    # Normalize column names
    df.columns = [col.strip().lower().replace("/", "").replace(" ", "_") for col in df.columns]

    # Identify Transaction Date column
    date_column = "transaction_datetime"
    if date_column not in df.columns:
        return jsonify({"error": "Transaction Date column is missing"}), 400
    
    # Drop rows where the date column has invalid or non-date values
    df = df[df[date_column].apply(lambda x: isinstance(x, str) and not x.strip().lower().startswith("sum total"))]
    
    # Convert Transaction Date column to datetime format
    df[date_column] = pd.to_datetime(df[date_column], format="%d/%m/%Y %H:%M", errors="coerce")
    
    if df[date_column].isna().all():
        return jsonify({"error": "Invalid or missing transaction dates"}), 400

    start_date = df[date_column].min().strftime("%d %B")
    end_date = df[date_column].max().strftime("%d %B")

    # Clean and normalize the 'product_category' column
    df["product_category"] = df["product_category"].str.replace('^="', '', regex=True).str.replace('"$', '', regex=True)
    df["normalized_category"] = df["product_category"].str.replace(r'[()&]', '', regex=True).str.strip()  # Remove special characters

    # Normalize selected categories from the frontend
    selected_categories_normalized = [re.sub(r'[()&]', '', cat).strip() for cat in selected_categories]

    # Filter the DataFrame for selected categories
    filtered_df = df[df["normalized_category"].isin(selected_categories_normalized)]

    if filtered_df.empty:
        return jsonify({"error": "No data available for selected categories"}), 400

    # Convert QTY to numeric and handle errors
    filtered_df["qty"] = pd.to_numeric(filtered_df["qty"], errors="coerce")

    # Get all unique outlets from the dataset
    all_outlets = df["outlet"].unique()

    # Pivot table
    pivot_table = pd.pivot_table(
        filtered_df,
        index=["sku"],
        columns=["outlet"],
        values="qty",  # Use "qty" directly, not a list
        aggfunc="sum"
    )

    pivot_table = pivot_table.reindex(columns=all_outlets)

    # Add total rows and columns
    pivot_table.loc["Total", :] = pivot_table.sum(axis=0)
    pivot_table["Total"] = pivot_table.sum(axis=1)

    # Flatten column multi-index and reset the index
    pivot_table.columns = [str(col) for col in pivot_table.columns] 
    pivot_table.reset_index(inplace=True)

    # Merge with Product Names
    product_names = filtered_df.drop_duplicates(subset=["sku"])[["sku", "product_name"]]
    pivot_table = pivot_table.merge(product_names, on="sku", how="left")

    # Move "Product Name" column to the first position
    pivot_table.insert(0, "product_name", pivot_table.pop("product_name"))

    # Sort by Product Name
    pivot_table.sort_values(by="product_name", inplace=True)

    pivot_table.rename(columns={"sku": "Barcode", "product_name": "Product Name"}, inplace=True)

    # Generate file name based on date range
    file_name = f"{start_date} to {end_date}_sales_export.xlsx"
    export_path = os.path.join(UPLOAD_FOLDER, file_name)

    # Write to Excel
    try:
        with pd.ExcelWriter(export_path, engine="xlsxwriter") as writer:
            pivot_table.to_excel(writer, sheet_name="sales report", index=False)
    except Exception as e:
        return jsonify({"error": f"Failed to write Excel file: {str(e)}"}), 500

    return send_file(
        export_path,
        as_attachment=True,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@app.route("/download/<file_name>", methods=["GET"])
def download_file(file_name):
    try:
        file_path = os.path.join(UPLOAD_FOLDER, file_name)

        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404

        return send_file(file_path, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
