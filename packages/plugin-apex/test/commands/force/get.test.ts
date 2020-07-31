import { expect, test } from '@salesforce/command/lib/test';

describe('force:get', () => {
  test
    .withOrg({ username: 'test@username.com' }, true)
    .withConnectionRequest(request => {
      if (!String(request).includes('ApexLog')) {
        return Promise.resolve({ records: [{ Id: 'idnumber' }, { Id: 'idnumber2' }] });
      }
      return Promise.resolve('exepected log string' as {});
    })
    .stdout()
    .command(['force:get', '--targetusername', 'test@username.com'])
    .it('runs force:get --targetusername test@username.com', ctx => {
      expect(ctx.stdout).to.contain('exepected log string');
    });

  test
    .withOrg({ username: 'test@username.com' }, true)
    .withConnectionRequest(request => {
      if (!String(request).includes('ApexLog')) {
        return Promise.resolve({ records: [{ Id: 'idnumber3' }] });
      }
      return Promise.resolve('exepected log string' as {});
    })
    .stdout()
    .command(['force:get', '--targetusername', 'test@username.com', '-n', '1'])
    .it(
      'should return one log with number parameter specified',
      ctx => {
        expect(ctx.stdout).to.contain('exepected log string');
      }
    );

  test
    .withOrg({ username: 'test@username.com' }, true)
    .withConnectionRequest(request => {
      if (!String(request).includes('ApexLog')) {
        return Promise.resolve({ records: [{ Id: 'idnumber4' }] });
      }
      return Promise.resolve('exepected log string' as {});
    })
    .stdout()
    .command(['force:get', '--targetusername', 'test@username.com', '-i', 'sjwtls8fpsFaEks'])
    .it(
      'should return log with log Id parameter specified',
      ctx => {
        expect(ctx.stdout).to.contain('exepected log string');
      }
    );

  test
    .withOrg({ username: 'test@username.com' }, true)
    .withConnectionRequest(request => {
      if (!String(request).includes('ApexLog')) {
        return Promise.resolve({ records: [{ Id: 'idnumber5' }] });
      }
      return Promise.resolve('exepected log string' as {});
    })
    .stdout()
    .command(['force:get', '--targetusername', 'test@username.com', '-d', '/Users/smit.shah/Desktop'])
    .it(
      'should return log with outputdir parameter specified',
      ctx => {
        expect(ctx.stdout).to.contain('exepected log string');
      }
    );

  test
    .withOrg({ username: 'test@username.com' }, true)
    .withConnectionRequest(request => {
      if (!String(request).includes('ApexLog')) {
        return Promise.resolve({ records: [{ Id: 'idnumber6' }] });
      }
      return Promise.resolve('exepected log string' as {});
    })
    .stdout()
    .command(['force:get', '--targetusername', 'test@username.com', '--json'])
    .it(
      'should return log with json parameter specified',
      ctx => {
        expect(ctx.stdout).to.contain('exepected log string');
      }
    );
});
