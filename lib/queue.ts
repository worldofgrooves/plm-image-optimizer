// Concurrency-limited queue for image processing
// Max 3 files processing simultaneously

type Task<T> = () => Promise<T>;

export function createQueue(concurrency: number = 3) {
  let running = 0;
  const pending: Array<{
    task: Task<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];

  function tryNext() {
    while (running < concurrency && pending.length > 0) {
      const next = pending.shift()!;
      running++;
      next
        .task()
        .then(next.resolve)
        .catch(next.reject)
        .finally(() => {
          running--;
          tryNext();
        });
    }
  }

  function add<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      pending.push({
        task: task as Task<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      tryNext();
    });
  }

  return { add };
}
