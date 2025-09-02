web: (python scripts/init_production_db.py || echo "DB init failed") && (python scripts/populate_agent_templates.py || echo "Template init failed") && uvicorn app:app --host 0.0.0.0 --port $PORT
