#!/bin/bash

# Move the new server.ts file to replace the old one
mv server.ts.new server.ts

# Install dependencies
npm install

# Run the server
npm run dev