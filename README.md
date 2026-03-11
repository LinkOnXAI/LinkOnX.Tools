# LinkOnX.Tools.Web

`LinkOnX.Tools.Web` includes:

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
