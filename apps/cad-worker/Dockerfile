# Stage 1: Conda build — installs pythonocc-core (~3-4 GB)
FROM ubuntu:22.04 AS conda-build

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y curl wget && apt-get clean

# Install Miniforge (architecture-aware; supports arm64 and amd64)
ARG TARGETARCH
RUN ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "aarch64" || echo "x86_64") && \
    curl -fsSL "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-${ARCH}.sh" \
    -o /tmp/miniforge.sh && \
    bash /tmp/miniforge.sh -b -p /opt/conda && \
    rm /tmp/miniforge.sh

ENV PATH="/opt/conda/bin:$PATH"

COPY apps/cad-worker/environment.yml /tmp/environment.yml
RUN conda env create -f /tmp/environment.yml && conda clean -afy

# Stage 2: Lean runtime
FROM ubuntu:22.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y curl && apt-get clean

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && apt-get clean

# Copy conda environment from stage 1
COPY --from=conda-build /opt/conda/envs/cad /opt/conda/envs/cad
ENV PATH="/opt/conda/envs/cad/bin:$PATH"
ENV PYTHON_BIN="/opt/conda/envs/cad/bin/python"

WORKDIR /app

# Copy Node.js worker
COPY apps/cad-worker/node/package.json ./node/
RUN cd node && npm install

COPY apps/cad-worker/node/src ./node/src/
COPY apps/cad-worker/node/tsconfig.json ./node/
# Use locally installed tsc (avoids npx downloading latest version)
RUN cd node && node_modules/.bin/tsc

# Copy Python pipeline
COPY apps/cad-worker/python ./python/

EXPOSE 3001

ENTRYPOINT ["node", "node/dist/index.js"]
