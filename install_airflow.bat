@echo off
REM Improved Airflow installation script for OutreachGlobal
REM Addresses security and configuration concerns

echo Setting up Airflow environment...
set AIRFLOW_HOME=%cd%\airflow_home
if not exist airflow_home mkdir airflow_home

echo Creating Airflow virtual environment...
python -m venv airflow_env

echo Activating environment and installing pinned Airflow version...
call airflow_env\Scripts\activate.bat
pip install apache-airflow==2.8.1 --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-2.8.1/constraints-3.10.txt"

echo Initializing Airflow database...
airflow db init

echo Creating secure admin user...
airflow users create --username outreach_admin --password OutreachGlobal2024! --firstname Outreach --lastname Admin --role Admin --email admin@outreachglobal.com

echo Starting Airflow webserver...
start "AirflowWebserver" /B airflow webserver --port 8080

echo Starting Airflow scheduler...
start "AirflowScheduler" /B airflow scheduler

echo.
echo Airflow installation complete!
echo - Web UI: http://localhost:8080
echo - Username: outreach_admin
echo - Password: OutreachGlobal2024!
echo - AIRFLOW_HOME: %AIRFLOW_HOME%
echo.
echo To stop Airflow services:
echo taskkill /F /FI "WINDOWTITLE eq AirflowWebserver*"
echo taskkill /F /FI "WINDOWTITLE eq AirflowScheduler*"
echo.
echo NOTE: For production, migrate to PostgreSQL and use proper secrets management
echo.
pause