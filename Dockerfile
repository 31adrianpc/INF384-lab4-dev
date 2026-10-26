FROM public.ecr.aws/lambda/nodejs:20 AS build
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM public.ecr.aws/lambda/nodejs:20 AS runtime
COPY --from=build /build/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY --from=build /build/dist/handler.js ${LAMBDA_TASK_ROOT}/

ARG APP_COMMIT=desconocido
ENV APP_COMMIT=${APP_COMMIT}

CMD ["handler.handler"]
