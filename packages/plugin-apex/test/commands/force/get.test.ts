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
        return Promise.resolve({ records: [{ Id: 'idnumber' }] });
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
});
