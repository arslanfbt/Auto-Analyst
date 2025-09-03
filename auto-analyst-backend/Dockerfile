FROM python:3.12

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user ./requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY --chown=user . /app

# Verify agents_config.json was copied (it should be in the backend directory)
RUN if [ -f "/app/agents_config.json" ]; then \
        echo "✅ agents_config.json found in container"; \
        ls -la /app/agents_config.json; \
    else \
        echo "⚠️ agents_config.json not found in container - will use fallback templates"; \
        ls -la /app/ | grep -E "agents|config" || echo "No config files found"; \
    fi

# Make entrypoint script executable
USER root
RUN chmod +x /app/entrypoint_local.sh
# Make populate script executable
RUN chmod +x /app/scripts/populate_agent_templates.py

USER user

# Use the entrypoint script instead of directly running uvicorn
CMD ["/app/entrypoint_local.sh"]