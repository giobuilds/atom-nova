#include "marker-index-wrapper.h"
#include "nan.h"
#include "patch-wrapper.h"
#include "range-wrapper.h"
#include "point-wrapper.h"
#include "text-writer.h"
#include "text-reader.h"
#include "text-buffer-wrapper.h"
#include "text-buffer-snapshot-wrapper.h"

using namespace v8;

void Init(Local<Object> exports) {
  PointWrapper::init();
  RangeWrapper::init();
  PatchWrapper::init(exports);
  MarkerIndexWrapper::init(exports);
  TextBufferWrapper::init(exports);
  TextWriter::init(exports);
  TextReader::init(exports);
  TextBufferSnapshotWrapper::init();
}

static void superstring_atomnova_register(
    v8::Local<v8::Object> exports,
    v8::Local<v8::Value> module,
    v8::Local<v8::Context> context,
    void* priv) {
  Init(exports);
}
NODE_MODULE_CONTEXT_AWARE(superstring, superstring_atomnova_register)