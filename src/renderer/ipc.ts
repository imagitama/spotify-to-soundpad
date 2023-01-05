export const subscribe = (
  topic: string,
  callback: (data: any) => any | Promise<any>
) => {
  window.electron.on(topic, (args) => {
    console.log(topic, args);
    callback(args[0]);
  });
};

export const publish = <TData>(topic: string, data: TData) => {
  window.electron.send(topic, data);
};
