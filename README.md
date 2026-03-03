Deployment steps:
docker build -t inventorizer:latest .
docker tag inventorizer:latest technet99m/inventorizer:latest
docker push technet99m/inventorizer:latest