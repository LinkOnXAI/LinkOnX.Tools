# LinkOnX.Tools

`LinkOnX.Tools` includes:

- `QueryDeveloper` web UI (`client`)
- API server with login and qmf file access (`server`)

## Features implemented

- Login required before qmf access
- Frontend loads qmf files from server API
- qmf source text can be edited and saved back to server
- Query/SQL-like text blocks are auto-detected from current qmf XML

## Run

```bash
npm install
npm run install:all
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`

## Configuration

- Configure runtime values in `server/.env`.
- Keep secrets outside source control.
- Required environment values are validated by the API server at startup.

On startup, backend ensures required resources and seeds `Sample.QueryDeveloper.qmf` when needed.

## Windows Server Deployment

Use this sequence to deploy the API server on Windows.

### 1. Prepare source and dependencies

```powershell
cd E:\Temp\LinkOn.Modeler\LinkOnX.Tools
git pull
npm.cmd install
npm.cmd --prefix server install
```

### 2. Configure environment

Create `server/.env` from `server/.env.example` and set production values:

- `PORT`
- `CLIENT_ORIGIN`
- `JWT_SECRET`
- `MSSQL_CONNECTION_STRING`
- `AUTH_USER_TABLE`
- `QSF_ROOT_DIR`
- `SECURITY_KEY_FILE` (required)

### 3. Validate server build

```powershell
npm.cmd --prefix server run build
```

### 3-1. Build client for IIS (output: `dist-iis`, base path: `/Tools/`)

```powershell
npm.cmd --prefix client run build:iis
```

This build is generated with Vite base path `/Tools/` and is intended to be hosted under IIS virtual path `/Tools`.
`dist-iis` includes `web.config` that forwards `/Tools/api/*` to `http://localhost:3001/api/*` and handles SPA fallback.

For IIS reverse proxy, ensure these modules are installed and enabled:

- URL Rewrite
- Application Request Routing (ARR) with Proxy enabled

### 4. Start server in production

```powershell
$env:NODE_ENV="production"
npm.cmd --prefix server run start
```

### 5. Health check

```powershell
Invoke-RestMethod http://localhost:3001/api/health
```

### Optional: run as background process (PM2)

```powershell
npm.cmd i -g pm2
pm2 start npm --name linkonx-tools-server --prefix server -- run start
pm2 save
```
