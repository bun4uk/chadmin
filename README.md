# Chadmin
Chadmin is easy to use ClickHouse running query dashboard. 

You can watch your currently running queries for the entire ClickHouse cluster and kill them if you want.

How to install:
0. `cp .env_example .env` and fill ClickHouse credentials
1. `composer install` 
2. `yarn install`
3. `yarn build`
4. `docker-compose build`
5. `docker-compose up -d`