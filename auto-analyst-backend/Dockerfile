FROM python:3.12

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user ./requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY --chown=user . /app

# Make entrypoint script executable
USER root
RUN chmod +x /app/entrypoint.sh
# Make populate script executable
RUN chmod +x /app/scripts/populate_agent_templates.py
USER user

# Use the entrypoint script instead of directly running uvicorn
CMD ["/app/entrypoint.sh"]