// 文章链接：https://zhuanlan.zhihu.com/p/21834559
// 源库地址： https://github.com/xieranmaya/blog/issues/3
var Promise = (function() {
  function Promise(resolver) { // Promise 主体逻辑实现
    if (typeof resolver !== 'function') {
      throw new TypeError('Promise resolver ' + resolver + ' is not a function')
    }
    if (!(this instanceof Promise)) return new Promise(resolver)

    var self = this
    self.callbacks = []
    self.status = 'pending'   // promise初始状态 pending

    function resolve(value) {
      setTimeout(function() {  // 推入宏任务队列
        if (self.status !== 'pending') {  // pending -> resolved/fulfilled
          return
        }
        self.status = 'resolved'
        self.data = value

        for (var i = 0; i < self.callbacks.length; i++) { // 批量触发then函数里面设置的resolved回调函数
          self.callbacks[i].onResolved(value)
        }
      })
    }

    function reject(reason) {
      setTimeout(function(){ // 推入宏任务队列
        if (self.status !== 'pending') {  // pending -> rejected
          return
        }
        self.status = 'rejected'
        self.data = reason

        for (var i = 0; i < self.callbacks.length; i++) {  // 批量触发then函数里面设置的rejected回调函数
          self.callbacks[i].onRejected(reason)
        }
      })
    }

    try{
      resolver(resolve, reject) // 执行实例化Promise对象时，传入的回调函数，同步执行。
    } catch(e) {
      reject(e)
    }
  }

  function resolvePromise(promise, x, resolve, reject) {
    var then
    var thenCalledOrThrow = false

    if (promise === x) {
      return reject(new TypeError('Chaining cycle detected for promise!'))
    }

    if ((x !== null) && ((typeof x === 'object') || (typeof x === 'function'))) {
      try {
        then = x.then
        if (typeof then === 'function') {
          then.call(x, function rs(y) {
            if (thenCalledOrThrow) return
            thenCalledOrThrow = true
            return resolvePromise(promise, y, resolve, reject)
          }, function rj(r) {
            if (thenCalledOrThrow) return
            thenCalledOrThrow = true
            return reject(r)
          })
        } else {
          return resolve(x)
        }
      } catch(e) {
        if (thenCalledOrThrow) return
        thenCalledOrThrow = true
        return reject(e)
      }
    } else {
      return resolve(x)
    }
  }

  Promise.prototype.then = function(onResolved, onRejected) {

    onResolved = typeof onResolved === 'function' ? onResolved : function(v){return v}
    // 判断then里面传入参数，不是函数，则进行参数透传， params => params
    onRejected = typeof onRejected === 'function' ? onRejected : function(r){throw r}
    var self = this
    var promise2

    if (self.status === 'resolved') {
      // Promise/A+ 规范，必须实现thenable的函数，且函数执行必须返回新的Promise实例，进行链式调用
      return promise2 = new Promise(function(resolve, reject) {
        setTimeout(function() {  // 推入异步宏任务队列
          try {
            var x = onResolved(self.data) // 执行 resolved状态对应的回调
            resolvePromise(promise2, x, resolve, reject)
          } catch(e) {
            return reject(e) // catch 里面是否需要执行当前promise 对应的 onRejected 回调? 需要， 上一个promise执行状态改变后，不会再次改变，错误执行的反馈只会在下一个Promise中体现。
          }
        })
      })
    }

    if (self.status === 'rejected') {  // 同上， 执行reject拒绝回调。
      return promise2 = new Promise(function(resolve, reject) {
        setTimeout(function() {
          try {
            var x = onRejected(self.data)
            resolvePromise(promise2, x, resolve, reject)
          } catch(e) {
            return reject(e)
          }
        })
      })
    }

    if (self.status === 'pending') {  // 当前状态为初始化的pending状态，则推入不同状态的回调队列中，后续状态发生变化时，再执行。
      return promise2 = new Promise(function(resolve, reject) {
        self.callbacks.push({
          onResolved: function(value) {
            try {
              var x = onResolved(value)
              resolvePromise(promise2, x, resolve, reject)
            } catch(e) {
              return reject(e)
            }
          },
          onRejected: function(reason) {
            try {
              var x = onRejected(reason)
              resolvePromise(promise2, x, resolve, reject)
            } catch(e) {
              return reject(e)
            }
          }
        })
      })
    }
  }

  Promise.prototype.valueOf = function() {
    return this.data
  }

  // catch，在promise状态出现转化 pending -》 rejected 时，触发。
  Promise.prototype.catch = function(onRejected) {
    return this.then(null, onRejected)
  }

  Promise.prototype.finally = function(fn) {
    // 为什么这里可以呢，因为所有的then调用是一起的，但是这个then里调用fn又异步了一次，所以它总是最后调用的。
    // 当然这里只能保证在已添加的函数里是最后一次，不过这也是必然。
    // 不过看起来比其它的实现要简单以及容易理解的多。
    // 貌似对finally的行为没有一个公认的定义，所以这个实现目前是跟Q保持一致，会返回一个新的Promise而不是原来那个。
    return this.then(function(v){
      setTimeout(fn)
      return v
    }, function(r){
      setTimeout(fn)
      throw r
    })
  }

  Promise.prototype.spread = function(fn, onRejected) {
    return this.then(function(values) {
      return fn.apply(null, values)
    }, onRejected)
  }

  Promise.prototype.inject = function(fn, onRejected) {
    return this.then(function(v) {
      return fn.apply(null, fn.toString().match(/\((.*?)\)/)[1].split(',').map(function(key){
        return v[key];
      }))
    }, onRejected)
  }

  Promise.prototype.delay = function(duration) {
    return this.then(function(value) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve(value)
        }, duration)
      })
    }, function(reason) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          reject(reason)
        }, duration)
      })
    })
  }

  Promise.all = function(promises) {
    return new Promise(function(resolve, reject) {
      var resolvedCounter = 0
      var promiseNum = promises.length
      var resolvedValues = new Array(promiseNum)
      for (var i = 0; i < promiseNum; i++) {
        (function(i) {
          Promise.resolve(promises[i]).then(function(value) {
            resolvedCounter++
            resolvedValues[i] = value
            if (resolvedCounter == promiseNum) {
              return resolve(resolvedValues)
            }
          }, function(reason) {
            return reject(reason)
          })
        })(i)
      }
    })
  }

  Promise.race = function(promises) {
    return new Promise(function(resolve, reject) {
      for (var i = 0; i < promises.length; i++) {
        Promise.resolve(promises[i]).then(function(value) {
          return resolve(value)
        }, function(reason) {
          return reject(reason)
        })
      }
    })
  }

  Promise.resolve = function(value) {
    var promise = new Promise(function(resolve, reject) {
      resolvePromise(promise, value, resolve, reject)
    })
    return promise
  }

  Promise.reject = function(reason) {
    return new Promise(function(resolve, reject) {
      reject(reason)
    })
  }

  Promise.fcall = function(fn){
    // 虽然fn可以接收到上一层then里传来的参数，但是其实是undefined，所以跟没有是一样的，因为resolve没参数啊
    return Promise.resolve().then(fn)
  }

  Promise.done = Promise.stop = function(){
    return new Promise(function(){})
  }

  Promise.deferred = Promise.defer = function() {
    var dfd = {}
    dfd.promise = new Promise(function(resolve, reject) {
      dfd.resolve = resolve
      dfd.reject = reject
    })
    return dfd
  }

  try { // CommonJS compliance
    module.exports = Promise
  } catch(e) {}

  return Promise
})()
