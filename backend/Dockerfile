FROM python:3.12-slim

WORKDIR /src

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --default-timeout=100 -r requirements.txt

COPY . .

RUN chmod +x /src/entrypoint.sh

ENTRYPOINT ["/src/entrypoint.sh"]

EXPOSE 8000