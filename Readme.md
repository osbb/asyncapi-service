# Build
```
docker build -t osbb/asyncapi-service . --no-cache
```

# Run
```
docker run -d --name mongo mongo
docker run -d -p 3001:3001 --link mongo --name asyncapi osbb/asyncapi-service
```
