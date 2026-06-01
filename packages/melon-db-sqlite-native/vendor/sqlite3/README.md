# SQLite amalgamation (Android)

Vanilla [SQLite amalgamation](https://www.sqlite.org/amalgamation.html) used by the Android NDK build. Do **not** use `expo-sqlite`'s vendor tree here — that build renames symbols to `exsqlite3_*` and will not link with `MelonSQLiteHostObject.cpp`.

Current files: SQLite **3.46.1** (`sqlite-amalgamation-3460100`).

To refresh:

```bash
curl -fsSL "https://www.sqlite.org/2024/sqlite-amalgamation-3460100.zip" -o /tmp/sqlite-amalg.zip
unzip -qo /tmp/sqlite-amalg.zip -d /tmp
cp /tmp/sqlite-amalgamation-3460100/sqlite3.c /tmp/sqlite-amalgamation-3460100/sqlite3.h .
```
