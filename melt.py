import pandas as pd

url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv'

#read the normalized CSV file
df = pd.read_csv(url)
df["Province/State"].fillna(df["Country/Region"], inplace = True)

#melt the normalized file, hold the country name and code variables, rename the melted columns
le = pd.melt(df, id_vars=['Province/State','Country/Region','Lat','Long'], var_name="period", value_name="confirmed")
le["location"] = le["Lat"].map(str) + ',' + le["Long"].map(str)

#print
print(le)

#write out the csv without and index
#le.to_csv('covid-unpivoted.csv', sep=',', index=False)