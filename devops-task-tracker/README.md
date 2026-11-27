# DevOps Task Tracker

A small Node.js + MongoDB app wrapped in a real-world DevOps workflow:
Docker, GitHub Actions CI/CD, security scanning, Nginx, and Prometheus + Grafana monitoring.

```
git push -> test -> build image -> Trivy scan -> push to Docker Hub -> deploy to EC2 -> health check
```

## 1. Run locally

```bash
cp .env.example .env
docker compose up --build
```

- App: http://localhost
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (user `admin`, password from `.env`)

Run the tests without Docker:

```bash
cd app && npm ci && npm test
```

## 2. Push to GitHub

```bash
git init && git add . && git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/devops-task-tracker.git
git push -u origin main
```

The `test` and `build-and-scan` jobs run on every push and pull request.

## 3. Prepare an EC2 server (Ubuntu 24.04, free tier)

1. Launch a `t2.micro` / `t3.micro` instance. In the security group, open port **22** (your IP only) and **80**.
2. SSH in and install Docker:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   sudo usermod -aG docker ubuntu   # log out and back in afterwards
   ```
3. Create a `.env` file on the server at `~/devops-task-tracker/.env` with a real `GRAFANA_PASSWORD`.

## 4. Add GitHub repository secrets

Settings > Secrets and variables > Actions:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `EC2_HOST` | EC2 public IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | full contents of your private `.pem` key |

Push to `main` and the deploy job releases the new version. Open `http://<EC2_HOST>` to see it.

## 5. View monitoring on the server

Prometheus and Grafana listen on localhost only. Reach them with an SSH tunnel:

```bash
ssh -i key.pem -L 3001:localhost:3001 -L 9090:localhost:9090 ubuntu@<EC2_HOST>
```

In Grafana, add a Prometheus data source with URL `http://prometheus:9090`.

## Notes

- To use your own MERN app, replace the `app/` folder and adjust the `Dockerfile` copy paths.
- If Trivy fails the build on a HIGH vulnerability, bump the base image or review the finding.
- Stretch goals: Terraform for the EC2 instance, automatic rollback, Kubernetes manifests.
