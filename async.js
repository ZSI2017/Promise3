//题目1
const p = Promise.resolve();
(async () => {
    await p;
    console.log('await end');
})();
p.then(() => {
    console.log('then 1');
}).then(() => {
    console.log('then 2');
});

// Chrome中运行结果是 await end -> then 1 -> then 2
// node中是 then 1 -> then 2 -> await end

console.log("----------------题目2----------------------------------")

//题目2
// 今日头条面试题
async function async1() {
    console.log('async1 start')
    await async2()
    console.log('async1 end')
}
async function async2() {
    console.log('async2')
}
console.log('script start')
setTimeout(function () {
    console.log('settimeout')
})
async1()
new Promise(function (resolve) {
    console.log('promise1')
    resolve()
}).then(function () {
    console.log('promise2')
})
console.log('script end')

// output
/*
    script start
    async1 start
    async2
    promise1
    script end
    async1 end
    promise2
    settimeout
*/