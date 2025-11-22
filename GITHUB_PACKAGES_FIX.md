# Fix GitHub Container Registry Permission Error

## Problem

Error: `denied: installation not allowed to Create organization package`

This happens when trying to push to an organization's package registry without proper permissions.

## Solution Options

### Option 1: Use Personal Package Namespace (Easiest)

The workflow is already updated to use `github.repository_owner` which will use your personal namespace if repo is personal, or org if you have permissions.

**If still failing, use Docker Hub instead:**

### Option 2: Use Docker Hub (Recommended for simplicity)

1. Create Docker Hub account
2. Create repository: `procure-to-pay-backend` and `procure-to-pay-frontend`
3. Add GitHub Secret: `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`
4. Update workflow:

```yaml
- name: Log in to Docker Hub
  uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}

- name: Build and push backend
  uses: docker/build-push-action@v5
  with:
    context: ./backend
    push: true
    tags: ${{ secrets.DOCKERHUB_USERNAME }}/procure-to-pay-backend:latest
```

5. Update `docker-compose.yml` on VPS:

```yaml
backend:
  image: YOUR_DOCKERHUB_USERNAME/procure-to-pay-backend:latest
```

### Option 3: Fix Organization Permissions

1. Go to Organization → Settings → Packages
2. Enable "GitHub Packages" if disabled
3. Go to Actions → General → Workflow permissions
4. Enable "Read and write permissions"
5. Check "Allow GitHub Actions to create and approve pull requests"

### Option 4: Use Personal Access Token (PAT)

1. Create PAT with `write:packages` permission
2. Add as GitHub Secret: `GHCR_TOKEN`
3. Update workflow:

```yaml
password: ${{ secrets.GHCR_TOKEN }}
```
