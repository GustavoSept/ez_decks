import * as os from 'os';

export function logSystemInfo() {
   const cpuCount = os.cpus().length;
   const totalMemory = os.totalmem();
   const freeMemory = os.freemem();

   console.log(`CPU Count: ${cpuCount}`);
   console.log(`Total Memory: ${(totalMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`);
   console.log(`Free Memory: ${(freeMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`);
}
