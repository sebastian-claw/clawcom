#!/bin/bash
while true; do
  curl -s -X POST http://localhost:3001/api/comments/typing -H 'Content-Type: application/json' -d '{"author":"Sebastian","typing":true}' 2>/dev/null
  sleep 3
  curl -s -X POST http://localhost:3001/api/comments/typing -H 'Content-Type: application/json' -d '{"author":"Sebastian","typing":false}' 2>/dev/null
  sleep 8
done
