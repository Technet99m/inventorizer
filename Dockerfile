FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
# Copy package files
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN SKIP_ENV_VALIDATION=1 pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]