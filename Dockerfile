FROM ghcr.io/nhsdigital/nhs-notify-devcontainer-loaded:1.0.19

WORKDIR /workspace
COPY . .

# Change ownership to vscode user before switching to it
RUN chown -R vscode:vscode /workspace

USER vscode
RUN git init .
RUN /usr/local/share/nhsnotify/scripts/postcreatecommand.sh
RUN /usr/local/share/nhsnotify/scripts/poststartcommand.sh

# Declare volumes that must be mounted
VOLUME ["/workspace/src/cloudevents/domains", "/workspace/docs"]

# Use zsh to run make so asdf tools are in PATH
# Check required directories are mounted before proceeding
CMD ["/bin/zsh", "-c", "\
    source ~/.zshrc && \
    if [ ! -d /workspace/src/cloudevents/domains ] || [ -z \"$(ls -A /workspace/src/cloudevents/domains 2>/dev/null)\" ]; then \
        echo 'ERROR: /workspace/src/cloudevents/domains must be mounted!' >&2; \
        echo 'Run with: docker run -v $(pwd)/src/cloudevents/domains:/workspace/src/cloudevents/domains ...' >&2; \
        exit 1; \
    fi && \
    if [ ! -d /workspace/docs ] || [ -z \"$(ls -A /workspace/docs 2>/dev/null)\" ]; then \
        echo 'ERROR: /workspace/docs must be mounted!' >&2; \
        echo 'Run with: docker run -v $(pwd)/docs:/workspace/docs ...' >&2; \
        exit 1; \
    fi && \
    make config clean build"]
