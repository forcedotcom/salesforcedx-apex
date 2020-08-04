import { expect, test } from '@salesforce/command/lib/test';
import * as fs from 'fs';
import * as stream from 'stream';

describe('force:get', () => {

  test
    .withOrg({ username: 'test@username.com' }, true)
    .withConnectionRequest(request => {
      if (!String(request).includes('ApexLog')) {
        return Promise.resolve({ records: [{ Id: 'idnumber' }] });
      }
      return Promise.resolve('48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG' as {});
    })
    .stdout()
    .command(['force:get', '--targetusername', 'test@username.com'])
    .it('runs default command with default output', ctx => {
      expect(ctx.stdout).to.contain('48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG');
    });

  test
    .withOrg({ username: 'test@username.com' }, true)
    .withConnectionRequest(request => {
      if (!String(request).includes('ApexLog')) {
        return Promise.resolve({ records: [{ Id: 'idnumber3' }] });
      }
      return Promise.resolve('48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG' as {});
    })
    .stdout()
    .command(['force:get', '--targetusername', 'test@username.com', '-n', '1'])
    .it(
      'should return one log with number parameter specified',
      ctx => {
        expect(ctx.stdout).to.contain('48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG');
      }
    );

  test
    .withOrg({ username: 'test@username.com' }, true)
    .withConnectionRequest(request => {
      if (!String(request).includes('ApexLog')) {
        return Promise.resolve({ records: [{ Id: 'idnumber4' }] });
      }
      return Promise.resolve('48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG' as {});
    })
    .stdout()
    .command(['force:get', '--targetusername', 'test@username.com', '-i', 'sjwtls8fpsFaEks'])
    .it(
      'should return log with log Id parameter specified',
      ctx => {
        expect(ctx.stdout).to.contain('48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG');
      }
    );

  test
    .withOrg({ username: 'test@username.com' }, true)
    .withConnectionRequest(request => {
      if (!String(request).includes('ApexLog')) {
        return Promise.resolve({ records: [{ Id: 'idnumber5' }] });
      }
      return Promise.resolve('48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG' as {});
    })
    .stdout()
    .stub(fs, 'openSync', () => 13)
    .stub(fs, 'closeSync', () => {})
    .stub(fs, 'mkdirSync', () => {})
    .stub(fs, 'createWriteStream', () => new stream.PassThrough())
    .command(['force:get', '--targetusername', 'test@username.com', '-d', '/Users/smit.shah/Desktop'])
    .it(
      'should return log with outputdir parameter specified',
      ctx => {
        expect(ctx.stdout).to.contain('48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG');
      }
    );

  test
    .withOrg({ username: 'test@username.com' }, true)
    .withConnectionRequest(request => {
      if (!String(request).includes('ApexLog')) {
        return Promise.resolve({ records: [{ Id: 'idnumber6' }] });
      }
      return Promise.resolve('48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG' as {});
    })
    .stdout()
    .command(['force:get', '--targetusername', 'test@username.com', '--json'])
    .it(
      'should return log with json parameter specified',
      ctx => {
        const result = ctx.stdout;
        // tslint:disable-next-line:no-unused-expression
        expect(result).to.not.be.empty;
        const resultJSON = JSON.parse(result);
        expect(resultJSON).to.ownProperty('status');
        expect(resultJSON.status).to.equal(0);
        expect(resultJSON).to.ownProperty('result');
        expect(resultJSON.result[0]).to.deep.include({log: '48.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;NBA,INFO;SYSTEM,DEBUG'});
      }
    );
});
