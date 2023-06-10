from datetime import date
import os
f=os.open(os.getenv('GITHUB_ENV'), 'a')
f.write(f'date={date.today()}')
f.close()
