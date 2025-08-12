# Specify the base Docker image with Playwright Chrome support
# This image includes all necessary dependencies for running Playwright browsers
FROM apify/actor-node-playwright-chrome:20

# Check preinstalled packages for debugging
RUN npm ls crawlee apify puppeteer playwright

# Copy just package.json and package-lock.json
# to speed up the build using Docker layer cache.
COPY --chown=myuser package*.json ./

# Install NPM packages, skip optional and development dependencies to
# keep the image small. Avoid logging too much and print the dependency
# tree for debugging
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version \
    && rm -r ~/.npm

# Next, copy the remaining files and directories with the source code.
# Since we do this after NPM install, quick build will be really fast
# for most source file changes.
COPY --chown=myuser . ./

# Run the image. The XVFB start script is needed for headful browsers
# even when running in headless mode for compatibility
CMD ./start_xvfb_and_run_cmd.sh && npm start --silent
