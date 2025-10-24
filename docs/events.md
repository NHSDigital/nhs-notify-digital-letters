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

<table>
    <tr>
        <th>Service</th>
        <th>Nice Name</th>
        <th>Title</th>
        <th>Type</th>
        <th>Produced By</th>
        <th>Consumed By</th>
        <th>Envelope</th>
        <th>Data</th>
    </tr>

{% for service_sorted in serviceSorteds %}
 {% assign nameSortedService = service_sorted.items | sort: "nice_name" %}
{% for event in nameSortedService %}
    <tr>
        <td>
          {% assign service = site.pages | where_exp:"service", "service.title == event.service" | first %}
           <a href="{{service.url | relative_url}}">{{ event.service }}</a>

        </td>
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
            {% assign producedby = site.pages | where_exp:"producer", "producer.events-raised contains event.title and producer.c4type == 'code'" %}
            <ul>
            {% for producer in producedby %}
                <li>
                    <a href="{{producer.url | relative_url}}">{{ producer.title }}</a>
                </li>
            {% endfor %}
            </ul>
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
{% endfor %}
</table>
