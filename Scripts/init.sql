CREATE TABLE stocks(
    time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    category TEXT NOT NULL,
    value FLOAT NOT NULL
);

CREATE TABLE old_stocks(
    category TEXT NOT NULL,
    values json NOT NULL,
    symbol TEXT NOT NULL
    );

CREATE TABLE jsonb_stocks(
    category TEXT NOT NULL,
    values jsonb NOT NULL,
    symbol TEXT NOT NULL
);

SELECT create_hypertable('stocks', 'time');

CREATE INDEX ix_stocks_time ON stocks(time DESC);