# backend/app.py
from flask import Flask, request, jsonify, g
from flask_cors import CORS
import sqlite3
from datetime import datetime

DB_PATH = "lostfound.db"
API_PREFIX = ""  # leave empty so routes are /items, /items/<id>

app = Flask(__name__)
CORS(app)  # allow all origins (ok for local dev). Restrict in production.


# --- DB helpers ---
def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db

def query_db(query, args=(), one=False):
    cur = get_db().execute(query, args)
    rows = cur.fetchall()
    cur.close()
    return (rows[0] if rows else None) if one else rows

def execute_db(query, args=()):
    conn = get_db()
    cur = conn.execute(query, args)
    conn.commit()
    lastid = cur.lastrowid
    cur.close()
    return lastid

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


# --- Initialize table if not exists ---
def init_db():
    create_sql = """
    CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        item_name TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        location TEXT,
        date TEXT,
        claimed INTEGER DEFAULT 0,
        claimed_by TEXT,
        found_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """
    execute_db(create_sql)

with app.app_context():
    init_db()


# --- To convert sqlite row -> dict ---
def row_to_dict(row):
    if not row:
        return None
    return {key: row[key] for key in row.keys()}


# --- Routes ---

# Create item
@app.route(f"{API_PREFIX}/items", methods=["POST"])
def create_item():
    data = request.get_json() or {}
    required = ["name", "item_name", "description", "type"]
    for r in required:
        if not data.get(r):
            return jsonify({"detail": f"Missing field: {r}"}), 400

    sql = """
    INSERT INTO items (name, email, item_name, description, type, location, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    lastid = execute_db(sql, (
        data.get("name"),
        data.get("email"),
        data.get("item_name"),
        data.get("description"),
        data.get("type"),
        data.get("location"),
        data.get("date")
    ))

    created = query_db("SELECT * FROM items WHERE id = ?", (lastid,), one=True)
    return jsonify(row_to_dict(created)), 201


# List items (optional pagination skip,limit)
@app.route(f"{API_PREFIX}/items", methods=["GET"])
def list_items():
    try:
        skip = int(request.args.get("skip", 0))
        limit = int(request.args.get("limit", 100))
    except ValueError:
        return jsonify({"detail": "skip and limit must be integers"}), 400

    rows = query_db(
        "SELECT * FROM items ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?",
        (limit, skip)
    )
    items = [row_to_dict(r) for r in rows]
    return jsonify(items)


# Read single item
@app.route(f"{API_PREFIX}/items/<int:item_id>", methods=["GET"])
def get_item(item_id):
    row = query_db("SELECT * FROM items WHERE id = ?", (item_id,), one=True)
    if not row:
        return jsonify({"detail": "Item not found"}), 404
    return jsonify(row_to_dict(row))


# Update item (partial update)
@app.route(f"{API_PREFIX}/items/<int:item_id>", methods=["PUT", "PATCH"])
def update_item(item_id):
    data = request.get_json() or {}
    allowed = {"name","email","item_name","description","type","location","date","claimed","claimed_by","found_by"}
    fields = []
    args = []
    for k, v in data.items():
        if k in allowed:
            fields.append(f"{k} = ?")
            # normalize booleans for claimed (store 0/1)
            if k == "claimed":
                args.append(1 if v else 0)
            else:
                args.append(v)
    if not fields:
        return jsonify({"detail": "No valid fields to update"}), 400

    args.append(item_id)
    sql = f"UPDATE items SET {', '.join(fields)} WHERE id = ?"
    execute_db(sql, tuple(args))
    updated = query_db("SELECT * FROM items WHERE id = ?", (item_id,), one=True)
    if not updated:
        return jsonify({"detail": "Item not found"}), 404
    return jsonify(row_to_dict(updated))


# Delete item with email verification (query param ?email=)
@app.route(f"{API_PREFIX}/items/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    provided_email = (request.args.get("email") or "").strip().lower()
    if not provided_email:
        return jsonify({"detail": "Provide email query param to verify deletion"}), 400

    row = query_db("SELECT * FROM items WHERE id = ?", (item_id,), one=True)
    if not row:
        return jsonify({"detail": "Item not found"}), 404

    stored_email = (row["email"] or "").strip().lower()
    if stored_email == "" or stored_email != provided_email:
        return jsonify({"detail": "Email does not match"}), 403

    execute_db("DELETE FROM items WHERE id = ?", (item_id,))
    return jsonify({"detail": "Deleted"}), 200


# Simple health endpoint
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.utcnow().isoformat()})


# Run
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
