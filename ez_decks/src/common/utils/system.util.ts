import * as os from 'os';
import * as fs from 'fs';

export function logSystemInfo() {
   let cpuCount: number;
   let totalMemory: number;
   let freeMemory: number;

   // Get memory limits (cgroup v1 or v2)
   try {
      const cgroupV2MemoryMaxPath = '/sys/fs/cgroup/memory.max';
      if (fs.existsSync(cgroupV2MemoryMaxPath)) {
         totalMemory = parseInt(fs.readFileSync(cgroupV2MemoryMaxPath, 'utf8').trim(), 10);
         if (totalMemory === -1) totalMemory = os.totalmem();
         const usedMemory = parseInt(fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim(), 10);
         freeMemory = totalMemory - usedMemory;
      } else {
         totalMemory = parseInt(fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim(), 10);
         const usedMemory = parseInt(fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim(), 10);
         freeMemory = totalMemory - usedMemory;
      }
   } catch (error) {
      totalMemory = os.totalmem();
      freeMemory = os.freemem();
      console.log('Could not read cgroup memory limits, falling back to system memory information');
      console.log(`Error message: ${error}`);
   }

   // Get CPU quota and period to calculate effective CPU count
   try {
      const cgroupV2CpuMaxPath = '/sys/fs/cgroup/cpu.max';
      if (fs.existsSync(cgroupV2CpuMaxPath)) {
         const cpuMaxContent = fs.readFileSync(cgroupV2CpuMaxPath, 'utf8').trim();
         const [cpuQuotaStr, cpuPeriodStr] = cpuMaxContent.split(' ');
         const cpuQuota = cpuQuotaStr === 'max' ? -1 : parseInt(cpuQuotaStr, 10);
         const cpuPeriod = parseInt(cpuPeriodStr, 10);

         if (cpuQuota > 0 && cpuPeriod > 0) {
            cpuCount = cpuQuota / cpuPeriod;
         } else {
            cpuCount = os.cpus().length; // Fallback to system CPU count
         }
      } else {
         const cpuQuota = parseInt(fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8').trim(), 10);
         const cpuPeriod = parseInt(fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8').trim(), 10);

         if (cpuQuota > 0 && cpuPeriod > 0) {
            cpuCount = cpuQuota / cpuPeriod;
         } else {
            cpuCount = os.cpus().length; // Fallback to system CPU count
         }
      }
   } catch (error) {
      cpuCount = os.cpus().length; // Fallback to system CPU count if cgroup files are not available
      console.log('Could not read cgroup CPU limits, falling back to system CPU count');
      console.log(`Error message: ${error}`);
   }

   console.log(`CPU Count (container): ${cpuCount.toFixed(2)}`);
   console.log(`Total Memory (container): ${(totalMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`);
   console.log(`Free Memory (container): ${(freeMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`);
}
