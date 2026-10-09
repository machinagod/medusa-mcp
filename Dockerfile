# Official node image via AWS's Docker Hub mirror (same digest as docker.io's):
# Railway's Docker Hub pulls get rate-limited (429), which fails the deploy.
FROM public.ecr.aws/docker/library/node:22.22.0-alpine AS builder

COPY . /app
WORKDIR /app

# Install exactly what package-lock.json pins, then build. A lockfile-less
# `npm install` re-resolved every dependency on each deploy, so a new upstream
# release could break the build of an unchanged commit (vitest 4.1.11's peer set
# crashed npm 10's resolver: "Cannot read properties of null (reading 'edgesOut')").
RUN npm ci && npm run build

# Set environment variables
ENV NODE_ENV=production

# Run the server
CMD ["node", "dist/index.js"]
