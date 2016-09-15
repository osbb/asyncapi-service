# Build
```
docker build -t osbb/asyncapi-service . --no-cache
```

# Run
```
docker run -d --hostname rabbitmq --name rabbitmq rabbitmq:3
docker run -d -p 3001:3001 --link mongo --name asyncapi osbb/asyncapi-service
```
