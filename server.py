from flask import Flask, request, jsonify, send_file, render_template
import pandas as pd
import os
import re
import io

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'  # Allow all origins
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'  # Allowed methods
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

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

    try:
        df = pd.read_csv(file, dtype=str)  # Read file from memory, not disk

        if "Product Category" not in df.columns:
            return jsonify({"error": "Column 'Product Category' not found in file"}), 400

        product_categories = df["Product Category"].dropna().unique().tolist()
        product_categories = [cat.strip() for cat in product_categories if cat.strip()]

        return jsonify({"categories": product_categories})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/export", methods=["POST"])
def export_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    selected_categories = request.form.get("selected_categories")

    if not selected_categories:
        return jsonify({"error": "No categories selected"}), 400

    selected_categories = eval(selected_categories)  # Convert string back to list

    try:
        df = pd.read_csv(file, dtype=str)  # Read file from memory, not disk
    except Exception as e:
        return jsonify({"error": f"Failed to read CSV: {str(e)}"}), 500

    # Normalize column names
    df.columns = [col.strip().lower().replace("/", "").replace(" ", "_") for col in df.columns]

    # Identify Transaction Date column
    date_column = "transaction_datetime"
    if date_column not in df.columns:
        return jsonify({"error": "Transaction Date column is missing"}), 400

    df = df[df[date_column].apply(lambda x: isinstance(x, str) and not x.strip().lower().startswith("sum total"))]
    df[date_column] = pd.to_datetime(df[date_column], format="%d/%m/%Y %H:%M", errors="coerce")

    if df[date_column].isna().all():
        return jsonify({"error": "Invalid or missing transaction dates"}), 400

    start_date = df[date_column].min().strftime("%d %B")
    end_date = df[date_column].max().strftime("%d %B")

    # Clean and normalize the 'product_category' column
    df["product_category"] = df["product_category"].str.replace('^="', '', regex=True).str.replace('"$', '', regex=True)
    df["normalized_category"] = df["product_category"].str.replace(r'[()&]', '', regex=True).str.strip()

    # Normalize selected categories from the frontend
    selected_categories_normalized = [re.sub(r'[()&]', '', cat).strip() for cat in selected_categories]

    # Filter the DataFrame for selected categories
    filtered_df = df[df["normalized_category"].isin(selected_categories_normalized)]

    if filtered_df.empty:
        return jsonify({"error": "No data available for selected categories"}), 400

    filtered_df["qty"] = pd.to_numeric(filtered_df["qty"], errors="coerce")
    all_outlets = df["outlet"].unique()

    pivot_table = pd.pivot_table(
        filtered_df,
        index=["sku"],
        columns=["outlet"],
        values="qty",
        aggfunc="sum"
    )

    pivot_table = pivot_table.reindex(columns=all_outlets)

    pivot_table.loc["Total", :] = pivot_table.sum(axis=0)
    pivot_table["Total"] = pivot_table.sum(axis=1)

    pivot_table.columns = [str(col) for col in pivot_table.columns] 
    pivot_table.reset_index(inplace=True)

    product_names = filtered_df.drop_duplicates(subset=["sku"])[["sku", "product_name"]]
    pivot_table = pivot_table.merge(product_names, on="sku", how="left")

    pivot_table.insert(0, "product_name", pivot_table.pop("product_name"))
    pivot_table.sort_values(by="product_name", inplace=True)
    pivot_table.rename(columns={"sku": "Barcode", "product_name": "Product Name"}, inplace=True)

    file_name = f"{start_date} to {end_date}_sales_export.xlsx"

    output = io.BytesIO()  # Create an in-memory file
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        pivot_table.to_excel(writer, sheet_name="sales report", index=False)
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name=file_name,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
