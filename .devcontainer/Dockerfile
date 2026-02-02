FROM --platform=linux/amd64 pulumi/pulumi:3.218.0-amd64

RUN apt update
RUN apt install sudo -y

RUN type -p curl >/dev/null || (sudo apt update && sudo apt install curl -y)
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
RUN sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
RUN sudo apt update
RUN sudo apt install gh -y
RUN sudo apt install vim -y

# Install DigitalOcean CLI (doctl)
RUN cd /tmp && \
    curl -sL https://github.com/digitalocean/doctl/releases/download/v1.149.0/doctl-1.149.0-linux-amd64.tar.gz | tar -xzv && \
    sudo mv doctl /usr/local/bin/
