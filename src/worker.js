/**
 * Workers run separately to do calculations and tasks.
 */

const cluster = require('cluster');

if(cluster.isMaster) {
  // Everything in here is on the cluster master.
  const CpuCount = require('os').cpus().length;
  console.log(`Master ${process.pid} is running.`);

  for(let i = 0; i < CpuCount; i++)
  {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
  // Everything in here is on the worker.
  const redis = require('./data/redis');
  const mongoose = require('./data/mongoose');
  const Task = mongoose.models.Task;

  const state = {
    active: true,
    database: {
      status: 'disconnected',
      SetStatus: (value) => {
        this.status = value;
      }
    },
    redis: {
      status: 'disconnected',
      SetStatus: (value) => {
        this.status = value;
      }
    }
  };

// Add database events
  mongoose.AddConnectionEvent('open', () => {
    state.database.SetStatus('ready');
  });
  mongoose.AddConnectionEvent('disconnected', () => {
    state.database.SetStatus('disconnected');
  });
  mongoose.AddConnectionEvent('error', () => {
    state.database.SetStatus('error');
  });

// Add Redis events
  redis.AddEvent('ready', () => {
    state.redis.SetStatus('ready');
  });
  redis.AddEvent('error', () => {
    // TODO: Check for only connection related errors.
    state.redis.SetStatus('error');
  });
  redis.AddEvent('end', () => {
    state.redis.SetStatus('disconnected');
  });

  console.log(`Worker ${process.pid} started`);

  const CreateTask = async function ()
  { let i = 0;
    while(i < 50)
    {
      //const task = await Task.create({
      //  status: 'ready',
      //  last_performed: Date.now(),
      //  target: `${process.pid}-${i}`,
      //});


      const task = await Task.findOneAndUpdate({ status: 'ready' },
        { status: 'refreshing', target: `${process.pid}-${i}`},
        { sort: { last_performed: 1} }).catch((error) => {
        console.log(error);
      });

      if(task && task.target)
      {
        console.log(`${process.pid}-${i} -> ` + task.target);
        i++;
      } else {
        console.log('NOTHING');
      }
    }
  };

  //for(let i = 0; i < 50; i++)
  //{
  //  Task.findOneAndUpdate({ status: 'ready' },
  //  { status: 'refreshing', target: `${process.pid}-${i}`},
  //  { sort: { last_performed: 1} }, (error, task) => {
  //      if(error) console.log(error);
  //      if(task && task.target) {
  //        console.log(`${process.pid}-${i} -> ` + task.target);
  //      } else {
  //        console.log('NOTHING');
  //      }
  //  });
  //}

  CreateTask();
}

/**
 * Main Loop:
 * - Connect
 * - Fetch Task (if available) else wait for broadcast / timeout
 * - Perform task
 * - Process output (redis broadcast, db save, ect.)
 * - Repeat.
 */
