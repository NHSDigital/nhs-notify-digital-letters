---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: page
title: Events
parent: Home
has_children: true
nav_order: 1.1
description: Events
summary: Events
is_not_draft: false
last_modified_date: 2024-05-28
owner: NHS Notify
author: Ross Buggins
---

{% assign sorted_events = site.events | group_by: "service"  %}
{% assign serviceSorteds = sorted_events | sort: "name" %}

<h2>Events Summary</h2>

{% for service_sorted in serviceSorteds %}
{% assign nameSortedService = service_sorted.items | sort: "nice_name" %}
{% assign service = site.pages | where_exp:"service", "service.title ==  service_sorted.name" | first %}

 <h3>   <a href="{{service.url | relative_url}}">{{ service.title }}</a></h3>

{% assign microservices = site.pages | where_exp:"microservice", "microservice.parent ==  service.title" %}

<div style="width:50%;background-color:black;">
<table style="word-wrap:break-word;table-layout: fixed;width:100%">
<tr>

<th style="align:left">Consumes</th>
<th style="align:left">Microservice</th>
<th style="align:left">Produces</th>
</tr>

{% for microservice in microservices %}
<tr>

<td>
<ul>
    {% for eventconsumed in microservice.events-consumed %}
        {% assign event = site.events | where_exp:"event", "event.title == eventconsumed" | first %}
         <li>
        <a href="{{event.url | relative_url}}">{{ event.nice_name }}</a>
        </li>
    {% endfor %}
</ul>
</td>

<td>
   <a href="{{microservice.url | relative_url}}">{{ microservice.title }}</a>
</td>

<td>
<ul>
  {% for eventproduced in microservice.events-raised %}
    {% assign event = site.events | where_exp:"event", "event.title == eventproduced" | first %}
    <li>
        <a href="{{event.url | relative_url}}">{{ event.nice_name }}</a>
    </li>
  {% endfor %}
</ul>
</td>

</tr>
{% endfor %}
</table>
</div>

{% endfor %}

<h2>Events Detailed Information</h2>

{% for service_sorted in serviceSorteds %}
{% assign nameSortedService = service_sorted.items | sort: "nice_name" %}
{% assign service = site.pages | where_exp:"service", "service.title ==  service_sorted.name" | first %}

 <h3>   <a href="{{service.url | relative_url}}">{{ service.title }}</a></h3>

<div style="width:100%;background-color:black;">
<table style="word-wrap:break-word;table-layout: fixed;width:100%">
    <tr>
        <th>Nice Name</th>
        <th>Title</th>
        <th>Type</th>
        <th>Produced By</th>
        <th>Consumed By</th>
        <th>Envelope</th>
        <th>Data</th>
    </tr>

{% for event in nameSortedService %}
    <tr>
        <td>
            <a href="{{event.url | relative_url}}">{{ event.nice_name }}</a>
        </td>
        <td>
            <a href="{{event.url | relative_url}}">{{ event.title }}</a>
        </td>
        <td>
            <a href="{{event.url | relative_url}}">{{ event.type }}</a>
        </td>
        <td>
            {% assign producedby = site.pages | where_exp:"producer", "producer.events-raised contains event.title and producer.c4type == 'code'" | first %}
            <a href="{{producedby.url | relative_url}}">{{ producedby.title }}</a>
        </td>
        <td>
            {% assign consumedby = site.pages | where_exp:"consumer", "consumer.events-consumed contains event.title and consumer.c4type == 'code'" %}
            <ul>
            {% for consumer in consumedby %}
                <li>
                    <a href="{{consumer.url | relative_url}}">{{ consumer.title }}</a>
                </li>
            {% endfor %}
            </ul>
        </td>
        <td>
            <a href="{{ event.schema_envelope}}">{{ event.schema_envelope | split: "/" | last}}</a>
        </td>
        <td>
            <a href="{{ event.schema_data }}">{{ event.schema_data | split: "/" | last}}</a>
        </td>
    </tr>
{% endfor %}

</table>
</div>
{% endfor %}
