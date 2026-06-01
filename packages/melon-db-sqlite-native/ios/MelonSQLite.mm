#import "MelonSQLite.h"
#import <sqlite3.h>
#import <React/RCTUtils.h>

@implementation MelonSQLite {
  sqlite3 *_db;
  NSRecursiveLock *_lock;
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

+ (NSString *)moduleName {
  return @"MelonSQLite";
}

- (instancetype)init {
  if (self = [super init]) {
    _lock = [[NSRecursiveLock alloc] init];
  }
  return self;
}

- (void)dealloc {
  if (_db != NULL) {
    sqlite3_close(_db);
    _db = NULL;
  }
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeMelonSQLiteSpecJSI>(params);
}

- (void)ensureOpen:(RCTPromiseRejectBlock)reject {
  if (_db == NULL) {
    reject(@"NOT_OPEN", @"Database not open. Call open(path) first.", nil);
  }
}

- (id)columnValue:(sqlite3_stmt *)stmt index:(int)index {
  switch (sqlite3_column_type(stmt, index)) {
    case SQLITE_INTEGER:
      return @(sqlite3_column_int64(stmt, index));
    case SQLITE_FLOAT:
      return @(sqlite3_column_double(stmt, index));
    case SQLITE_TEXT: {
      const unsigned char *text = sqlite3_column_text(stmt, index);
      return text ? [NSString stringWithUTF8String:(const char *)text] : [NSNull null];
    }
    case SQLITE_BLOB:
      return [NSNull null];
    case SQLITE_NULL:
    default:
      return [NSNull null];
  }
}

- (BOOL)bindParams:(sqlite3_stmt *)stmt params:(NSArray *)params error:(NSString **)errorOut {
  for (int i = 0; i < (int)params.count; i++) {
    id value = params[i];
    int bindIndex = i + 1;
    int rc = SQLITE_OK;
    if (value == nil || value == [NSNull null]) {
      rc = sqlite3_bind_null(stmt, bindIndex);
    } else if ([value isKindOfClass:[NSNumber class]]) {
      const char *objCType = [value objCType];
      if (strcmp(objCType, @encode(BOOL)) == 0) {
        rc = sqlite3_bind_int(stmt, bindIndex, [value boolValue] ? 1 : 0);
      } else if (CFNumberIsFloatType((CFNumberRef)value)) {
        rc = sqlite3_bind_double(stmt, bindIndex, [value doubleValue]);
      } else {
        rc = sqlite3_bind_int64(stmt, bindIndex, [value longLongValue]);
      }
    } else if ([value isKindOfClass:[NSString class]]) {
      rc = sqlite3_bind_text(stmt, bindIndex, [value UTF8String], -1, SQLITE_TRANSIENT);
    } else {
      if (errorOut) {
        *errorOut = [NSString stringWithFormat:@"Unsupported bind param at index %d", i];
      }
      return NO;
    }
    if (rc != SQLITE_OK) {
      if (errorOut) {
        *errorOut = [NSString stringWithUTF8String:sqlite3_errmsg(_db)];
      }
      return NO;
    }
  }
  return YES;
}

- (NSString *)resolveDatabasePath:(NSString *)path {
  if ([path hasPrefix:@"/"]) {
    return path;
  }
  if ([path containsString:@".."]) {
    return path;
  }
  NSArray *dirs = NSSearchPathForDirectoriesInDomains(
      NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documents = [dirs firstObject];
  if (documents == nil) {
    return path;
  }
  return [documents stringByAppendingPathComponent:path];
}

- (void)open:(NSString *)path
     resolve:(RCTPromiseResolveBlock)resolve
      reject:(RCTPromiseRejectBlock)reject {
  [_lock lock];
  @try {
    if ([path containsString:@".."]) {
      reject(@"INVALID_PATH", @"Database path must not contain '..'", nil);
      return;
    }
    NSString *resolved = [self resolveDatabasePath:path];
    if (_db != NULL) {
      sqlite3_close(_db);
      _db = NULL;
    }
    int rc = sqlite3_open([resolved UTF8String], &_db);
    if (rc != SQLITE_OK) {
      NSString *message = _db ? [NSString stringWithUTF8String:sqlite3_errmsg(_db)] : @"Failed to open database";
      if (_db != NULL) {
        sqlite3_close(_db);
        _db = NULL;
      }
      reject(@"SQLITE_OPEN", message, nil);
      return;
    }
    sqlite3_busy_timeout(_db, 5000);
    resolve(nil);
  } @finally {
    [_lock unlock];
  }
}

- (void)close:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [_lock lock];
  @try {
    if (_db != NULL) {
      sqlite3_close(_db);
      _db = NULL;
    }
    resolve(nil);
  } @finally {
    [_lock unlock];
  }
}

- (void)exec:(NSString *)sql
     resolve:(RCTPromiseResolveBlock)resolve
      reject:(RCTPromiseRejectBlock)reject {
  [_lock lock];
  @try {
    [self ensureOpen:reject];
    if (_db == NULL) {
      return;
    }
    char *errMsg = NULL;
    int rc = sqlite3_exec(_db, [sql UTF8String], NULL, NULL, &errMsg);
    if (rc != SQLITE_OK) {
      NSString *message = errMsg ? [NSString stringWithUTF8String:errMsg] : @"exec failed";
      if (errMsg) {
        sqlite3_free(errMsg);
      }
      reject(@"SQLITE_EXEC", message, nil);
      return;
    }
    resolve(nil);
  } @finally {
    [_lock unlock];
  }
}

- (void)queryAll:(NSString *)sql
          params:(NSArray *)params
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
  [_lock lock];
  @try {
    [self ensureOpen:reject];
    if (_db == NULL) {
      return;
    }
    sqlite3_stmt *stmt = NULL;
    int rc = sqlite3_prepare_v2(_db, [sql UTF8String], -1, &stmt, NULL);
    if (rc != SQLITE_OK) {
      reject(@"SQLITE_PREPARE", [NSString stringWithUTF8String:sqlite3_errmsg(_db)], nil);
      return;
    }
    NSString *bindError = nil;
    if (![self bindParams:stmt params:params error:&bindError]) {
      sqlite3_finalize(stmt);
      reject(@"SQLITE_BIND", bindError ?: @"bind failed", nil);
      return;
    }
    NSMutableArray *rows = [NSMutableArray array];
    while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
      int columnCount = sqlite3_column_count(stmt);
      NSMutableDictionary *row = [NSMutableDictionary dictionaryWithCapacity:columnCount];
      for (int i = 0; i < columnCount; i++) {
        const char *name = sqlite3_column_name(stmt, i);
        NSString *key = name ? [NSString stringWithUTF8String:name] : [NSString stringWithFormat:@"col_%d", i];
        id value = [self columnValue:stmt index:i];
        if (value != [NSNull null]) {
          row[key] = value;
        } else {
          row[key] = [NSNull null];
        }
      }
      [rows addObject:row];
    }
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
      reject(@"SQLITE_STEP", [NSString stringWithUTF8String:sqlite3_errmsg(_db)], nil);
      return;
    }
    resolve(rows);
  } @finally {
    [_lock unlock];
  }
}

- (void)queryFirst:(NSString *)sql
            params:(NSArray *)params
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  [_lock lock];
  @try {
    [self ensureOpen:reject];
    if (_db == NULL) {
      return;
    }
    sqlite3_stmt *stmt = NULL;
    int rc = sqlite3_prepare_v2(_db, [sql UTF8String], -1, &stmt, NULL);
    if (rc != SQLITE_OK) {
      reject(@"SQLITE_PREPARE", [NSString stringWithUTF8String:sqlite3_errmsg(_db)], nil);
      return;
    }
    NSString *bindError = nil;
    if (![self bindParams:stmt params:params error:&bindError]) {
      sqlite3_finalize(stmt);
      reject(@"SQLITE_BIND", bindError ?: @"bind failed", nil);
      return;
    }
    id result = [NSNull null];
    rc = sqlite3_step(stmt);
    if (rc == SQLITE_ROW) {
      int columnCount = sqlite3_column_count(stmt);
      NSMutableDictionary *row = [NSMutableDictionary dictionaryWithCapacity:columnCount];
      for (int i = 0; i < columnCount; i++) {
        const char *name = sqlite3_column_name(stmt, i);
        NSString *key = name ? [NSString stringWithUTF8String:name] : [NSString stringWithFormat:@"col_%d", i];
        id value = [self columnValue:stmt index:i];
        if (value != [NSNull null]) {
          row[key] = value;
        } else {
          row[key] = [NSNull null];
        }
      }
      result = row;
    } else if (rc != SQLITE_DONE) {
      sqlite3_finalize(stmt);
      reject(@"SQLITE_STEP", [NSString stringWithUTF8String:sqlite3_errmsg(_db)], nil);
      return;
    }
    sqlite3_finalize(stmt);
    resolve(result == [NSNull null] ? (id)[NSNull null] : result);
  } @finally {
    [_lock unlock];
  }
}

- (void)run:(NSString *)sql
     params:(NSArray *)params
    resolve:(RCTPromiseResolveBlock)resolve
     reject:(RCTPromiseRejectBlock)reject {
  [_lock lock];
  @try {
    [self ensureOpen:reject];
    if (_db == NULL) {
      return;
    }
    sqlite3_stmt *stmt = NULL;
    int rc = sqlite3_prepare_v2(_db, [sql UTF8String], -1, &stmt, NULL);
    if (rc != SQLITE_OK) {
      reject(@"SQLITE_PREPARE", [NSString stringWithUTF8String:sqlite3_errmsg(_db)], nil);
      return;
    }
    NSString *bindError = nil;
    if (![self bindParams:stmt params:params error:&bindError]) {
      sqlite3_finalize(stmt);
      reject(@"SQLITE_BIND", bindError ?: @"bind failed", nil);
      return;
    }
    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc != SQLITE_DONE) {
      reject(@"SQLITE_RUN", [NSString stringWithUTF8String:sqlite3_errmsg(_db)], nil);
      return;
    }
    resolve(nil);
  } @finally {
    [_lock unlock];
  }
}

@end
