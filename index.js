#!/usr/bin/env node

let outputLevel = 2;

const runfn = {

    debug(...args) {
        if(outputLevel < 3) return;
        console.log(...args);
    },

    info(...args) {
        if(outputLevel < 2) return;
        console.log(...args);
    },

    output(...args) {
        if(outputLevel < 1) return;
        console.log(...args);
    },

    process_cmdline: async function() {

        // Check whether directly called or included
        if(module.parent) {
            return;
        }

        const { program } = require('commander');

        program
          .option('--encoded', 'the arguments are URL encoded')
          .option('--silent', 'no output (output level = 0)')
          .option('--output-only', 'do not show run stats, display only output (output level = 1)')
          .option('--info', 'show only run stats and output (default) (output level = 2)')
          .option('--debug', 'show debug output (output level = 3)')
          .option('--method <method>', 'task execution method (schedule/queue/adhoc/etc)')
          .option('--origin <origin>', 'task originated from (server name)')

        program.parse(process.argv);

        const options = program.opts();

        if(options.silent) {
            outputLevel = 0;
        }
        else if(options.outputOnly) {
            outputLevel = 1;
        }
        else if(options.debug) {
            outputLevel = 3;
        }
        let args = program.args;
        if(!args || args.length < 2) {
            console.log('no args provided. exiting..');
            process.exit(1);
            return;
        }

        const model = args.shift();
        const fn = args.shift();
        let fn_args = args;
        let is_success = true;

        // If arguments are encoded (to avoid spaces)
        if(options['encoded']) {
            fn_args = fn_args.map(decodeURIComponent);
        }

        try {
            is_success = await this.run(model, fn, ...fn_args);
        }
        catch(err) {
            is_success = false;
            console.log(err);
        }

        if(!module.parent) {
            if(is_success) {
                process.exit();
            }
            else {
                process.exit(1);
            }
        }
    },

    run: async function(model, fn, ...args) {
        this.info(new Date().toString());
        this.info(model, fn, args);
        const started = new Date().getTime() / 1000;
        const Model = require(process.cwd() + '/' + model);
        try {
            var output = await Model[fn](...args);
        }
        catch(err) {
            // console.log(JSON.stringify({
            //     status: 'error',
            //     error: err
            // }));
            console.log(`Error in executing ${model}.${fn}`);
            console.log(err);
            if(err.message) {
                output = { 'status': 'exception', 'message': err.message };
            }
        }
        this.output(JSON.stringify(output));
        var ended = new Date().getTime() / 1000;
        var runtime = ended - started;
        runtime = parseFloat(parseFloat(runtime).toPrecision(3));
        this.info(runtime + ' s');
        let status = this.task_status(output);
        if(status == 'error') {
            return false;
        }
        else {
            return true;
        }
    },

    task_status: function(output) {
        let status;
        if(!output || output.status == 'error' || output.status == 'exception') {
            status = 'error';
        }
        else if(output.status == 'warning') {
            status = 'warning';
        }
        else {
            status = 'success';
        }
        return status;    
    },

}

module.exports = runfn;

if(!module.parent) {
    runfn.process_cmdline();
}



