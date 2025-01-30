import plotly.express as px
import chart_studio
import chart_studio.plotly as py
import chart_studio.tools as tls

# Set your Chart Studio credentials
chart_studio.tools.set_credentials_file(username='ashad', api_key='your_api_key')

# Sample data
df = px.data.iris()
fig = px.scatter(df, x='sepal_width', y='sepal_length', color='species')

# Upload the chart to Chart Studio and get the embed link
url = py.plot(fig, filename='scatter_plot', auto_open=False)
embed_code = tls.get_embed(url)

print(embed_code)
