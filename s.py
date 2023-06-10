from datetime import date
import os
f=open(os.getenv('GITHUB_ENV'), 'a')
f.write('date='+date.today().strftime("%Y%m%d"))
f.close()
